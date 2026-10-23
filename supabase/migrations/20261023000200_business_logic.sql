-- =============================================================================
-- GroupDrive — business logic
-- All privileged state changes go through these functions. Clients never send
-- trusted values (participant counts, totals, commission amounts, statuses).
-- Conventions:
--   * SECURITY DEFINER functions pin search_path to '' and fully qualify names.
--   * Functions raise exceptions with stable snake_case messages that the app
--     maps to user-facing copy (see src/lib/errors.ts).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Identity & authorization helpers
-- -----------------------------------------------------------------------------
create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = p_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and ur.role = 'admin' and not p.is_suspended
  );
$$;

create or replace function public.current_dealer_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select du.dealer_id
  from public.dealer_users du
  join public.dealers d on d.id = du.dealer_id
  join public.profiles p on p.id = du.user_id
  where du.user_id = auth.uid()
    and du.is_active
    and d.is_active
    and not p.is_suspended;
$$;

create or replace function public.is_dealer_member(p_dealer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_dealer_id in (select public.current_dealer_ids());
$$;

-- True when running as a privileged database role (service role, migrations,
-- pg_cron, or inside a SECURITY DEFINER function owned by postgres).
create or replace function public.is_trusted_context()
returns boolean
language sql
stable
as $$
  select current_user not in ('anon', 'authenticated');
$$;

create or replace function public.get_setting(p_key text, p_default jsonb default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.value from public.app_settings s where s.key = p_key), p_default);
$$;

-- A user counts as verified when their account is in good standing and they
-- satisfy the configured verification policy.
create or replace function public.is_user_verified(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and not p.is_suspended
      and p.email_verified_at is not null
      and p.phone is not null
      and p.city_id is not null
      and (
        coalesce((public.get_setting('verification.require_phone', 'false'::jsonb))::boolean, false) = false
        or p.phone_verified_at is not null
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- Audit logging (append-only)
-- -----------------------------------------------------------------------------
create or replace function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb default null,
  p_after jsonb default null,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
begin
  if v_actor is null then
    v_role := 'system';
  elsif exists (select 1 from public.user_roles where user_id = v_actor and role = 'admin') then
    v_role := 'admin';
  elsif exists (select 1 from public.dealer_users where user_id = v_actor and is_active) then
    v_role := 'dealer';
  else
    v_role := 'customer';
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, reason, metadata)
  values (v_actor, v_role, p_action, p_entity_type, p_entity_id, p_before, p_after, p_reason, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- Admin-callable wrapper for actions performed through plain table writes.
create or replace function public.app_log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb default null,
  p_after jsonb default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  perform public.log_audit(p_action, p_entity_type, p_entity_id, p_before, p_after, p_reason);
end;
$$;

-- -----------------------------------------------------------------------------
-- Notifications (outbox). The app's dispatcher delivers pending email rows and
-- only marks them `sent` when the provider confirms acceptance.
-- -----------------------------------------------------------------------------
create or replace function public.enqueue_notification(
  p_user_id uuid,
  p_type text,
  p_subject text,
  p_body text,
  p_link_path text default null,
  p_dedupe_key text default null,
  p_payload jsonb default '{}'::jsonb
)
-- Returns true only when a new notification was queued (false for duplicates).
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_inserted integer;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if not found then
    return false;
  end if;

  insert into public.notifications (user_id, channel, type, subject, body, link_path, payload, dedupe_key, status)
  values (p_user_id, 'in_app', p_type, p_subject, p_body, p_link_path, coalesce(p_payload, '{}'::jsonb),
          case when p_dedupe_key is null then null else p_dedupe_key || ':in_app' end, 'sent')
  on conflict (dedupe_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  if v_profile.notify_email and v_profile.email is not null
     and (v_profile.notify_batch_updates or p_type not like 'batch_%') then
    insert into public.notifications (user_id, recipient_email, channel, type, subject, body, link_path, payload, dedupe_key)
    values (p_user_id, v_profile.email, 'email', p_type, p_subject, p_body, p_link_path, coalesce(p_payload, '{}'::jsonb),
            case when p_dedupe_key is null then null else p_dedupe_key || ':email' end)
    on conflict (dedupe_key) do nothing;
  end if;
  return true;
end;
$$;

create or replace function public.notify_dealer_users(
  p_dealer_id uuid,
  p_type text,
  p_subject text,
  p_body text,
  p_link_path text,
  p_dedupe_prefix text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in select du.user_id from public.dealer_users du where du.dealer_id = p_dealer_id and du.is_active loop
    perform public.enqueue_notification(r.user_id, p_type, p_subject, p_body, p_link_path,
      p_dedupe_prefix || ':' || r.user_id::text);
  end loop;
end;
$$;

create or replace function public.notify_batch_participants(
  p_batch_id uuid,
  p_type text,
  p_subject text,
  p_body text,
  p_dedupe_prefix text,
  p_verified_only boolean default true
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select m.user_id from public.batch_memberships m
    where m.batch_id = p_batch_id and m.status = 'active'
      and (not p_verified_only or m.eligibility = 'verified')
  loop
    if public.enqueue_notification(r.user_id, p_type, p_subject, p_body,
         '/dashboard/groups/' || p_batch_id::text, p_dedupe_prefix || ':' || r.user_id::text) then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  update public.notifications
     set read_at = now()
   where user_id = auth.uid() and channel = 'in_app' and read_at is null
     and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- New-user bootstrap and auth sync
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_city uuid;
  v_phone text := nullif(regexp_replace(coalesce(v_meta ->> 'phone', ''), '[\s-]', '', 'g'), '');
  v_category public.vehicle_category;
  v_timeline public.purchase_timeline;
begin
  select id into v_city from public.cities where slug = v_meta ->> 'city' and is_active;

  if v_phone is not null and v_phone !~ '^\+?[0-9]{10,15}$' then
    v_phone := null;
  end if;

  begin
    v_category := (v_meta ->> 'preferred_category')::public.vehicle_category;
  exception when others then
    v_category := null;
  end;
  begin
    v_timeline := (v_meta ->> 'purchase_timeline')::public.purchase_timeline;
  exception when others then
    v_timeline := null;
  end;

  insert into public.profiles (id, full_name, email, phone, city_id, preferred_category, purchase_timeline, email_verified_at)
  values (
    new.id,
    left(nullif(trim(v_meta ->> 'full_name'), ''), 120),
    new.email,
    v_phone,
    v_city,
    v_category,
    v_timeline,
    new.email_confirmed_at
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'customer')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Re-evaluate a user's memberships in open batches after verification changes.
create or replace function public.refresh_user_memberships(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verified boolean := public.is_user_verified(p_user_id);
  r record;
begin
  for r in
    select m.id, m.eligibility
    from public.batch_memberships m
    join public.batches b on b.id = m.batch_id
    where m.user_id = p_user_id and m.status = 'active' and b.status = 'open'
      and m.eligibility <> 'ineligible'
  loop
    if v_verified and r.eligibility = 'pending_verification' then
      update public.batch_memberships set eligibility = 'verified' where id = r.id;
    elsif not v_verified and r.eligibility = 'verified' then
      update public.batch_memberships set eligibility = 'pending_verification', verified_at = null where id = r.id;
    end if;
  end loop;
end;
$$;

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
     set email = new.email,
         email_verified_at = new.email_confirmed_at,
         -- A phone confirmed through Supabase Auth OTP counts only when it matches the profile phone.
         phone_verified_at = case
           when new.phone_confirmed_at is not null and new.phone is not null
                and regexp_replace(coalesce(p.phone, ''), '^\+', '') = regexp_replace(new.phone, '^\+', '')
             then coalesce(p.phone_verified_at, new.phone_confirmed_at)
           else p.phone_verified_at
         end
   where p.id = new.id;

  perform public.refresh_user_memberships(new.id);
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email, email_confirmed_at, phone, phone_confirmed_at on auth.users
  for each row execute function public.handle_auth_user_updated();

-- Profile guard: customers may edit personal fields only; verification and
-- suspension fields are managed by trusted code.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
as $$
begin
  if public.is_trusted_context() then
    return new;
  end if;

  if new.email_verified_at is distinct from old.email_verified_at
     or new.phone_verified_at is distinct from old.phone_verified_at
     or new.is_suspended is distinct from old.is_suspended
     or new.email is distinct from old.email then
    raise exception 'forbidden_field';
  end if;

  -- Changing the mobile number invalidates its verification.
  if new.phone is distinct from old.phone then
    new.phone_verified_at := null;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.after_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phone is distinct from old.phone
     or new.city_id is distinct from old.city_id
     or new.phone_verified_at is distinct from old.phone_verified_at
     or new.email_verified_at is distinct from old.email_verified_at
     or new.is_suspended is distinct from old.is_suspended then
    perform public.refresh_user_memberships(new.id);
  end if;
  return null;
end;
$$;

create trigger profiles_after_update
  after update on public.profiles
  for each row execute function public.after_profile_update();

-- -----------------------------------------------------------------------------
-- Batch state machine
-- -----------------------------------------------------------------------------
create or replace function public.batch_transition_allowed(p_from public.batch_status, p_to public.batch_status)
returns boolean
language sql
immutable
as $$
  select case p_from
    when 'draft' then p_to in ('open', 'cancelled')
    when 'open' then p_to in ('target_reached', 'closed_deadline', 'expired', 'cancelled')
    when 'target_reached' then p_to in ('quotation_requested', 'cancelled')
    when 'closed_deadline' then p_to in ('quotation_requested', 'cancelled')
    when 'quotation_requested' then p_to in ('quotation_review', 'quotes_published', 'cancelled')
    when 'quotation_review' then p_to in ('quotation_requested', 'quotes_published', 'cancelled')
    when 'quotes_published' then p_to in ('purchase_in_progress', 'completed', 'cancelled')
    when 'purchase_in_progress' then p_to in ('completed', 'cancelled')
    else false -- completed, cancelled, expired are terminal
  end;
$$;

create or replace function public.guard_batch_update()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     and not public.batch_transition_allowed(old.status, new.status) then
    raise exception 'invalid_batch_transition';
  end if;

  if public.is_trusted_context() then
    return new;
  end if;

  -- Direct (admin) edits may only touch descriptive fields; lifecycle fields go
  -- through the admin_* functions which run in a trusted context.
  if new.status is distinct from old.status
     or new.verified_participant_count is distinct from old.verified_participant_count
     or new.deadline is distinct from old.deadline
     or new.closed_at is distinct from old.closed_at
     or new.close_reason is distinct from old.close_reason
     or new.opened_at is distinct from old.opened_at then
    raise exception 'forbidden_field';
  end if;

  if old.status <> 'draft' and (
       new.target_participants is distinct from old.target_participants
       or new.minimum_participants is distinct from old.minimum_participants
       or new.variant_id is distinct from old.variant_id
       or new.city_id is distinct from old.city_id) then
    raise exception 'batch_locked';
  end if;
  return new;
end;
$$;

create trigger batches_guard_update
  before update on public.batches
  for each row execute function public.guard_batch_update();

create or replace function public.guard_batch_insert()
returns trigger
language plpgsql
as $$
begin
  if public.is_trusted_context() then
    return new;
  end if;
  new.status := 'draft';
  new.verified_participant_count := 0;
  new.opened_at := null;
  new.closed_at := null;
  new.close_reason := null;
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger batches_guard_insert
  before insert on public.batches
  for each row execute function public.guard_batch_insert();

-- -----------------------------------------------------------------------------
-- Memberships: guard + trusted participant counting
-- -----------------------------------------------------------------------------
create or replace function public.guard_membership_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.batches;
  v_count integer;
  v_becoming_verified boolean;
begin
  v_becoming_verified := new.status = 'active' and new.eligibility = 'verified'
    and (tg_op = 'INSERT' or old.status <> 'active' or old.eligibility <> 'verified');

  if tg_op = 'INSERT' or v_becoming_verified then
    -- Serialise every change that can affect the count on the batch row.
    select * into v_batch from public.batches where id = new.batch_id for update;

    if tg_op = 'INSERT' and (v_batch.status <> 'open' or v_batch.deadline <= now()) then
      raise exception 'batch_not_open';
    end if;

    if v_becoming_verified then
      select count(*) into v_count
      from public.batch_memberships m
      where m.batch_id = new.batch_id and m.status = 'active' and m.eligibility = 'verified'
        and m.id <> new.id;

      if v_batch.status <> 'open' or v_batch.deadline <= now() or v_count >= v_batch.target_participants then
        if tg_op = 'INSERT' and v_count >= v_batch.target_participants then
          raise exception 'batch_full';
        end if;
        -- Batch already closed or full: stays pending and never counts.
        new.eligibility := 'pending_verification';
        new.verified_at := null;
        return new;
      end if;
      new.verified_at := now();
    end if;
  end if;

  if new.eligibility <> 'verified' then
    new.verified_at := null;
  end if;
  return new;
end;
$$;

create trigger batch_memberships_guard
  before insert or update on public.batch_memberships
  for each row execute function public.guard_membership_write();

create or replace function public.recount_batch(p_batch_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.batches;
  v_count integer;
begin
  select * into v_batch from public.batches where id = p_batch_id for update;
  if not found then
    return 0;
  end if;

  select count(*) into v_count
  from public.batch_memberships m
  where m.batch_id = p_batch_id and m.status = 'active' and m.eligibility = 'verified';

  if v_count <> v_batch.verified_participant_count then
    update public.batches set verified_participant_count = v_count where id = p_batch_id;
  end if;

  if v_batch.status = 'open' and v_count >= v_batch.target_participants then
    perform public.close_batch(p_batch_id, 'target_reached');
  end if;
  return v_count;
end;
$$;

create or replace function public.after_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recount_batch(old.batch_id);
  else
    perform public.recount_batch(new.batch_id);
  end if;
  return null;
end;
$$;

create trigger batch_memberships_recount
  after insert or update or delete on public.batch_memberships
  for each row execute function public.after_membership_change();

-- -----------------------------------------------------------------------------
-- Customer: join / leave
-- -----------------------------------------------------------------------------
create or replace function public.join_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_batch public.batches;
  v_existing public.batch_memberships;
  v_membership public.batch_memberships;
  v_eligibility public.membership_eligibility;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'profile_missing';
  end if;
  if v_profile.is_suspended then
    raise exception 'account_suspended';
  end if;
  if v_profile.email_verified_at is null then
    raise exception 'email_not_verified';
  end if;
  if v_profile.phone is null or v_profile.city_id is null or v_profile.full_name is null then
    raise exception 'profile_incomplete';
  end if;

  select * into v_batch from public.batches where id = p_batch_id for update;
  if not found then
    raise exception 'batch_not_found';
  end if;

  select * into v_existing from public.batch_memberships
   where batch_id = p_batch_id and user_id = v_uid for update;

  -- Idempotent: a repeated submission returns the existing membership.
  if found and v_existing.status = 'active' then
    return jsonb_build_object(
      'membership_id', v_existing.id, 'eligibility', v_existing.eligibility,
      'already_member', true, 'batch_status', v_batch.status,
      'verified_participant_count', v_batch.verified_participant_count);
  end if;
  if found and v_existing.status = 'removed' then
    raise exception 'membership_removed';
  end if;

  if v_batch.status <> 'open' or v_batch.deadline <= now() then
    raise exception 'batch_not_open';
  end if;
  if v_profile.city_id <> v_batch.city_id then
    raise exception 'city_not_eligible';
  end if;
  if v_batch.verified_participant_count >= v_batch.target_participants then
    raise exception 'batch_full';
  end if;

  v_eligibility := case when public.is_user_verified(v_uid) then 'verified' else 'pending_verification' end;

  if v_existing.id is not null then
    update public.batch_memberships
       set status = 'active', eligibility = v_eligibility, withdrawn_at = null, joined_at = now()
     where id = v_existing.id
     returning * into v_membership;
  else
    insert into public.batch_memberships (batch_id, user_id, eligibility)
    values (p_batch_id, v_uid, v_eligibility)
    returning * into v_membership;
  end if;

  perform public.enqueue_notification(
    v_uid, 'batch_joined', 'You joined a GroupDrive group',
    'You have joined "' || v_batch.title || '" for free. We will keep you updated as the group progresses. '
      || 'Joining does not guarantee a discount or oblige you to buy.',
    '/dashboard/groups/' || p_batch_id::text,
    'joined:' || v_membership.id::text || ':' || extract(epoch from v_membership.joined_at)::bigint::text);

  select * into v_batch from public.batches where id = p_batch_id;
  return jsonb_build_object(
    'membership_id', v_membership.id, 'eligibility', v_membership.eligibility,
    'already_member', false, 'batch_status', v_batch.status,
    'verified_participant_count', v_batch.verified_participant_count);
end;
$$;

create or replace function public.leave_batch(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_batch public.batches;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_batch from public.batches where id = p_batch_id for update;
  if not found then
    raise exception 'batch_not_found';
  end if;
  if v_batch.status <> 'open' then
    raise exception 'batch_not_open';
  end if;
  update public.batch_memberships
     set status = 'withdrawn', withdrawn_at = now()
   where batch_id = p_batch_id and user_id = v_uid and status = 'active';
  if not found then
    raise exception 'not_a_member';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Closure & quotation request workflow (idempotent)
-- -----------------------------------------------------------------------------
create or replace function public.create_quotation_requests(p_batch_id uuid, p_dealer_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.batches;
  v_manufacturer uuid;
  v_inserted integer := 0;
  r record;
begin
  select * into v_batch from public.batches where id = p_batch_id for update;
  if not found then
    raise exception 'batch_not_found';
  end if;
  if v_batch.status not in ('target_reached', 'closed_deadline', 'quotation_requested', 'quotation_review') then
    raise exception 'batch_not_ready_for_quotes';
  end if;

  select v.manufacturer_id into v_manufacturer
  from public.vehicle_variants vv join public.vehicles v on v.id = vv.vehicle_id
  where vv.id = v_batch.variant_id;

  for r in
    insert into public.quotation_requests (batch_id, dealer_id, status, participant_count_snapshot, response_due_at, created_by)
    select v_batch.id, d.id, 'sent', v_batch.verified_participant_count, now() + interval '7 days', auth.uid()
    from public.dealers d
    where d.is_active
      and d.authorization_status = 'verified'
      and d.city_id = v_batch.city_id
      and exists (select 1 from public.dealer_brands db where db.dealer_id = d.id and db.manufacturer_id = v_manufacturer)
      and (p_dealer_ids is null or d.id = any (p_dealer_ids))
    on conflict (batch_id, dealer_id) do nothing
    returning id, dealer_id
  loop
    v_inserted := v_inserted + 1;
    perform public.notify_dealer_users(r.dealer_id, 'quotation_requested',
      'New quotation request: ' || v_batch.title,
      'A GroupDrive buyer group has closed with ' || v_batch.verified_participant_count
        || ' verified participants. Please submit an itemised quotation in the dealer portal.',
      '/dealer/requests', 'qr:' || r.id::text);
  end loop;

  if v_batch.status in ('target_reached', 'closed_deadline')
     and exists (select 1 from public.quotation_requests q where q.batch_id = p_batch_id) then
    update public.batches set status = 'quotation_requested' where id = p_batch_id;
    perform public.notify_batch_participants(p_batch_id, 'batch_quotes_requested',
      'Dealer quotations requested for ' || v_batch.title,
      'We have requested itemised quotations from authorised dealerships. Quotations are reviewed before they are shown to you.',
      'quotes_requested:' || p_batch_id::text);
    perform public.log_audit('batch.quotations_requested', 'batch', p_batch_id::text,
      jsonb_build_object('status', v_batch.status), jsonb_build_object('status', 'quotation_requested'));
  end if;

  return v_inserted;
end;
$$;

create or replace function public.close_batch(p_batch_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.batches;
  v_new public.batch_status;
begin
  if p_reason not in ('target_reached', 'deadline', 'manual') then
    raise exception 'invalid_close_reason';
  end if;

  select * into v_batch from public.batches where id = p_batch_id for update;
  if not found then
    raise exception 'batch_not_found';
  end if;
  -- Idempotent: anything other than an open batch is already closed.
  if v_batch.status <> 'open' then
    return false;
  end if;

  if p_reason = 'target_reached' then
    if v_batch.verified_participant_count < v_batch.target_participants then
      raise exception 'target_not_reached';
    end if;
    v_new := 'target_reached';
  elsif v_batch.verified_participant_count >= v_batch.minimum_participants then
    v_new := 'closed_deadline';
  else
    v_new := 'expired';
  end if;

  update public.batches
     set status = v_new, closed_at = now(), close_reason = p_reason
   where id = p_batch_id;

  perform public.log_audit('batch.closed', 'batch', p_batch_id::text,
    jsonb_build_object('status', v_batch.status),
    jsonb_build_object('status', v_new, 'verified_participant_count', v_batch.verified_participant_count),
    p_reason);

  if v_new = 'expired' then
    perform public.notify_batch_participants(p_batch_id, 'batch_closed',
      v_batch.title || ' has closed',
      'This group closed at its deadline without enough verified participants to request dealer quotations. '
        || 'You can join another open group at any time, free of charge.',
      'closed:' || p_batch_id::text, false);
  else
    perform public.notify_batch_participants(p_batch_id,
      case when v_new = 'target_reached' then 'batch_target_reached' else 'batch_closed' end,
      v_batch.title || case when v_new = 'target_reached' then ' reached its target' else ' has closed' end,
      'The group has closed with ' || v_batch.verified_participant_count
        || ' verified participants. Next, we coordinate itemised quotations from authorised dealerships. '
        || 'This does not guarantee a discount or a purchase.',
      'closed:' || p_batch_id::text, false);
    perform public.create_quotation_requests(p_batch_id);
  end if;

  return true;
end;
$$;

-- Scheduled job entry point: safe to run as often as you like.
create or replace function public.process_due_batches()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_closed integer := 0;
  v_requests integer := 0;
  v_reminders integer := 0;
  v_expired_quotes integer := 0;
begin
  -- 1. Close open batches whose deadline has passed or whose target was met.
  for r in
    select b.id, b.verified_participant_count >= b.target_participants as full
    from public.batches b
    where b.status = 'open' and (b.deadline <= now() or b.verified_participant_count >= b.target_participants)
    for update skip locked
  loop
    if public.close_batch(r.id, case when r.full then 'target_reached' else 'deadline' end) then
      v_closed := v_closed + 1;
    end if;
  end loop;

  -- 2. Retry quotation requests for closed batches that had no eligible dealer earlier.
  for r in
    select b.id from public.batches b
    where b.status in ('target_reached', 'closed_deadline')
      and not exists (select 1 from public.quotation_requests q where q.batch_id = b.id)
    for update skip locked
  loop
    v_requests := v_requests + public.create_quotation_requests(r.id);
  end loop;

  -- 3. Deadline reminders (once per participant per batch).
  for r in
    select b.id, b.title, b.deadline from public.batches b
    where b.status = 'open' and b.deadline > now() and b.deadline <= now() + interval '48 hours'
  loop
    v_reminders := v_reminders + public.notify_batch_participants(r.id, 'batch_deadline_approaching',
      r.title || ' closes soon',
      'This group closes on ' || to_char(r.deadline at time zone 'Asia/Kolkata', 'DD Mon YYYY HH24:MI') || ' IST.',
      'deadline_soon:' || r.id::text, false);
  end loop;

  -- 4. Expire published quotations past their validity date.
  with expired as (
    update public.dealer_quotations
       set status = 'expired'
     where status in ('approved', 'published') and valid_until < (now() at time zone 'Asia/Kolkata')::date
    returning id
  )
  select count(*) into v_expired_quotes from expired;

  return jsonb_build_object('closed', v_closed, 'quotation_requests', v_requests,
    'reminders', v_reminders, 'expired_quotations', v_expired_quotes, 'ran_at', now());
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin batch operations
-- -----------------------------------------------------------------------------
create or replace function public.admin_transition_batch(p_batch_id uuid, p_to public.batch_status, p_reason text default null)
returns public.batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.batches;
  v_result public.batches;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into v_batch from public.batches where id = p_batch_id for update;
  if not found then
    raise exception 'batch_not_found';
  end if;

  if p_to = 'open' then
    if v_batch.status <> 'draft' then
      raise exception 'invalid_batch_transition';
    end if;
    if v_batch.deadline <= now() then
      raise exception 'deadline_in_past';
    end if;
    update public.batches set status = 'open', opened_at = now() where id = p_batch_id;
  elsif p_to in ('closed_deadline', 'expired') and v_batch.status = 'open' then
    perform public.close_batch(p_batch_id, 'manual');
  elsif p_to = 'cancelled' then
    if p_reason is null or char_length(trim(p_reason)) < 5 then
      raise exception 'reason_required';
    end if;
    if not public.batch_transition_allowed(v_batch.status, 'cancelled') then
      raise exception 'invalid_batch_transition';
    end if;
    update public.batches set status = 'cancelled', cancelled_reason = p_reason,
      closed_at = coalesce(closed_at, now()), close_reason = coalesce(close_reason, 'manual')
     where id = p_batch_id;
    update public.quotation_requests set status = 'cancelled'
     where batch_id = p_batch_id and status in ('pending', 'sent');
    perform public.notify_batch_participants(p_batch_id, 'batch_cancelled',
      v_batch.title || ' was cancelled',
      'This group has been cancelled. Reason: ' || p_reason || '. You were never charged anything for joining.',
      'cancelled:' || p_batch_id::text, false);
  elsif p_to in ('quotation_requested', 'quotation_review', 'quotes_published', 'purchase_in_progress', 'completed') then
    if not public.batch_transition_allowed(v_batch.status, p_to) then
      raise exception 'invalid_batch_transition';
    end if;
    if p_to = 'quotes_published' and not exists (
      select 1 from public.dealer_quotations q where q.batch_id = p_batch_id and q.status = 'published') then
      raise exception 'no_published_quotations';
    end if;
    update public.batches set status = p_to where id = p_batch_id;
  else
    raise exception 'invalid_batch_transition';
  end if;

  select * into v_result from public.batches where id = p_batch_id;
  perform public.log_audit('batch.status_changed', 'batch', p_batch_id::text,
    jsonb_build_object('status', v_batch.status), jsonb_build_object('status', v_result.status), p_reason);
  return v_result;
end;
$$;

create or replace function public.admin_extend_batch_deadline(p_batch_id uuid, p_new_deadline timestamptz, p_reason text)
returns public.batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.batches;
  v_result public.batches;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'reason_required';
  end if;
  select * into v_batch from public.batches where id = p_batch_id for update;
  if not found then
    raise exception 'batch_not_found';
  end if;
  if v_batch.status not in ('draft', 'open') then
    raise exception 'batch_not_open';
  end if;
  if p_new_deadline <= v_batch.deadline or p_new_deadline <= now() then
    raise exception 'deadline_must_be_later';
  end if;

  insert into public.batch_deadline_extensions (batch_id, previous_deadline, new_deadline, reason, extended_by)
  values (p_batch_id, v_batch.deadline, p_new_deadline, p_reason, auth.uid());
  update public.batches set deadline = p_new_deadline where id = p_batch_id returning * into v_result;

  perform public.log_audit('batch.deadline_extended', 'batch', p_batch_id::text,
    jsonb_build_object('deadline', v_batch.deadline), jsonb_build_object('deadline', p_new_deadline), p_reason);
  perform public.notify_batch_participants(p_batch_id, 'batch_deadline_extended',
    v_batch.title || ': deadline extended',
    'The closing date for this group is now ' || to_char(p_new_deadline at time zone 'Asia/Kolkata', 'DD Mon YYYY HH24:MI') || ' IST.',
    'extended:' || p_batch_id::text || ':' || extract(epoch from p_new_deadline)::bigint::text, false);
  return v_result;
end;
$$;

create or replace function public.admin_request_quotations(p_batch_id uuid, p_dealer_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  v_count := public.create_quotation_requests(p_batch_id, p_dealer_ids);
  perform public.log_audit('batch.quotation_requests_created', 'batch', p_batch_id::text, null,
    jsonb_build_object('created', v_count, 'dealer_ids', to_jsonb(p_dealer_ids)));
  return v_count;
end;
$$;

create or replace function public.admin_set_membership_eligibility(
  p_membership_id uuid, p_eligibility public.membership_eligibility, p_reason text)
returns public.batch_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.batch_memberships;
  v_new public.batch_memberships;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'reason_required';
  end if;
  select * into v_old from public.batch_memberships where id = p_membership_id for update;
  if not found then
    raise exception 'membership_not_found';
  end if;
  if p_eligibility = 'verified' and not public.is_user_verified(v_old.user_id) then
    raise exception 'user_not_verified';
  end if;

  update public.batch_memberships
     set eligibility = p_eligibility,
         ineligible_reason = case when p_eligibility = 'ineligible' then p_reason else null end
   where id = p_membership_id
   returning * into v_new;

  perform public.log_audit('membership.eligibility_changed', 'batch_membership', p_membership_id::text,
    jsonb_build_object('eligibility', v_old.eligibility), jsonb_build_object('eligibility', v_new.eligibility), p_reason);
  return v_new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Purchase intent
-- -----------------------------------------------------------------------------
create or replace function public.admin_request_purchase_intent(p_batch_id uuid, p_respond_by timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.batches;
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into v_batch from public.batches where id = p_batch_id;
  if not found then
    raise exception 'batch_not_found';
  end if;
  if v_batch.status in ('draft', 'cancelled', 'expired', 'completed') then
    raise exception 'batch_not_eligible';
  end if;

  insert into public.purchase_intent_confirmations (membership_id, batch_id, user_id, respond_by)
  select m.id, m.batch_id, m.user_id, p_respond_by
  from public.batch_memberships m
  where m.batch_id = p_batch_id and m.status = 'active' and m.eligibility = 'verified'
  on conflict (membership_id) do nothing;
  get diagnostics v_count = row_count;

  perform public.notify_batch_participants(p_batch_id, 'purchase_intent_requested',
    'Please confirm your buying intent: ' || v_batch.title,
    'Let us know whether you are still interested in buying this vehicle. Your answer helps dealerships prepare accurate quotations. It is not a purchase commitment.',
    'intent:' || p_batch_id::text);
  perform public.log_audit('batch.purchase_intent_requested', 'batch', p_batch_id::text, null,
    jsonb_build_object('requested', v_count, 'respond_by', p_respond_by));
  return v_count;
end;
$$;

create or replace function public.respond_purchase_intent(p_batch_id uuid, p_confirm boolean, p_note text default null)
returns public.purchase_intent_confirmations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.purchase_intent_confirmations;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  update public.purchase_intent_confirmations
     set status = case when p_confirm then 'confirmed'::public.intent_status else 'declined'::public.intent_status end,
         responded_at = now(),
         note = left(p_note, 500)
   where batch_id = p_batch_id and user_id = auth.uid()
   returning * into v_row;
  if not found then
    raise exception 'intent_not_requested';
  end if;
  return v_row;
end;
$$;

-- -----------------------------------------------------------------------------
-- Quotations
-- -----------------------------------------------------------------------------
create or replace function public.recalculate_quotation_totals(p_quotation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.dealer_quotations q
     set total_payable = coalesce(t.charges, 0) - coalesce(t.discounts, 0),
         total_discount = coalesce(t.discounts, 0)
    from (
      select
        sum(li.amount) filter (where li.is_included and li.category <> 'discount') as charges,
        sum(li.amount) filter (where li.is_included and li.category = 'discount') as discounts
      from public.quotation_line_items li
      where li.quotation_id = p_quotation_id
    ) t
   where q.id = p_quotation_id;
end;
$$;

create or replace function public.can_edit_quotation(p_quotation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.dealer_quotations q
    where q.id = p_quotation_id
      and (
        (public.is_admin() and q.status in ('draft', 'submitted', 'under_review'))
        or (public.is_dealer_member(q.dealer_id) and q.status = 'draft')
      )
  );
$$;

create or replace function public.can_view_quotation(p_quotation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.dealer_quotations q
    where q.id = p_quotation_id
      and (
        public.is_admin()
        or public.is_dealer_member(q.dealer_id)
        or (
          q.published_at is not null
          and q.status in ('published', 'expired', 'withdrawn')
          and exists (
            select 1 from public.batch_memberships m
            where m.batch_id = q.batch_id and m.user_id = auth.uid()
              and m.status = 'active' and m.eligibility = 'verified'
          )
        )
      )
  );
$$;

create or replace function public.after_line_item_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_quotation_totals(old.quotation_id);
  else
    perform public.recalculate_quotation_totals(new.quotation_id);
  end if;
  return null;
end;
$$;

create trigger quotation_line_items_totals
  after insert or update or delete on public.quotation_line_items
  for each row execute function public.after_line_item_change();

create or replace function public.guard_line_item_write()
returns trigger
language plpgsql
as $$
begin
  if public.is_trusted_context() then
    return coalesce(new, old);
  end if;
  if tg_op in ('UPDATE', 'DELETE') and not public.can_edit_quotation(old.quotation_id) then
    raise exception 'quotation_locked';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and not public.can_edit_quotation(new.quotation_id) then
    raise exception 'quotation_locked';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger quotation_line_items_guard
  before insert or update or delete on public.quotation_line_items
  for each row execute function public.guard_line_item_write();

create or replace function public.guard_quotation_update()
returns trigger
language plpgsql
as $$
begin
  if public.is_trusted_context() then
    return new;
  end if;

  -- Status, totals and review metadata are only changed by trusted functions.
  if new.status is distinct from old.status
     or new.total_payable is distinct from old.total_payable
     or new.total_discount is distinct from old.total_discount
     or new.dealer_id is distinct from old.dealer_id
     or new.batch_id is distinct from old.batch_id
     or new.variant_id is distinct from old.variant_id
     or new.quotation_request_id is distinct from old.quotation_request_id
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at
     or new.published_by is distinct from old.published_by
     or new.published_at is distinct from old.published_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.submitted_at is distinct from old.submitted_at then
    raise exception 'forbidden_field';
  end if;

  if public.can_edit_quotation(old.id) then
    return new;
  end if;

  -- Dealers may keep availability current and shorten (never extend) validity
  -- on approved/published quotations.
  if public.is_dealer_member(old.dealer_id) and old.status in ('submitted', 'under_review', 'approved', 'published') then
    if new.quote_reference is distinct from old.quote_reference
       or new.conditions is distinct from old.conditions
       or new.delivery_timeline is distinct from old.delivery_timeline
       or new.document_path is distinct from old.document_path then
      raise exception 'quotation_locked';
    end if;
    if new.valid_until is distinct from old.valid_until
       and (new.valid_until is null or old.valid_until is null or new.valid_until > old.valid_until) then
      raise exception 'validity_extension_requires_review';
    end if;
    return new;
  end if;

  raise exception 'quotation_locked';
end;
$$;

create trigger dealer_quotations_guard
  before update on public.dealer_quotations
  for each row execute function public.guard_quotation_update();

create or replace function public.start_quotation(p_request_id uuid)
returns public.dealer_quotations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.quotation_requests;
  v_batch public.batches;
  v_quote public.dealer_quotations;
begin
  select * into v_req from public.quotation_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if not (public.is_admin() or public.is_dealer_member(v_req.dealer_id)) then
    raise exception 'forbidden';
  end if;
  if v_req.status in ('cancelled', 'declined') then
    raise exception 'request_closed';
  end if;

  select * into v_quote from public.dealer_quotations where quotation_request_id = p_request_id;
  if found then
    return v_quote;
  end if;

  select * into v_batch from public.batches where id = v_req.batch_id;
  insert into public.dealer_quotations (quotation_request_id, batch_id, dealer_id, variant_id, created_by, is_demo)
  values (p_request_id, v_req.batch_id, v_req.dealer_id, v_batch.variant_id, auth.uid(), v_batch.is_demo)
  returning * into v_quote;

  perform public.log_audit('quotation.started', 'dealer_quotation', v_quote.id::text, null,
    jsonb_build_object('request_id', p_request_id));
  return v_quote;
end;
$$;

create or replace function public.dealer_decline_request(p_request_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.quotation_requests;
begin
  select * into v_req from public.quotation_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if not (public.is_admin() or public.is_dealer_member(v_req.dealer_id)) then
    raise exception 'forbidden';
  end if;
  if v_req.status not in ('pending', 'sent') then
    raise exception 'request_closed';
  end if;
  update public.quotation_requests set status = 'declined', responded_at = now(),
    notes = coalesce(notes || E'\n', '') || 'Declined: ' || coalesce(p_reason, '')
   where id = p_request_id;
  perform public.log_audit('quotation_request.declined', 'quotation_request', p_request_id::text, null, null, p_reason);
end;
$$;

create or replace function public.submit_quotation(p_quotation_id uuid)
returns public.dealer_quotations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.dealer_quotations;
  v_batch public.batches;
begin
  select * into v_quote from public.dealer_quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'quotation_not_found';
  end if;
  if not (public.is_admin() or public.is_dealer_member(v_quote.dealer_id)) then
    raise exception 'forbidden';
  end if;
  if v_quote.status <> 'draft' then
    raise exception 'invalid_quotation_transition';
  end if;
  if not exists (select 1 from public.quotation_line_items li
                 where li.quotation_id = p_quotation_id and li.category = 'ex_showroom' and li.is_included) then
    raise exception 'ex_showroom_line_required';
  end if;
  if v_quote.valid_until is null or v_quote.valid_until < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'valid_until_required';
  end if;

  update public.dealer_quotations
     set status = 'submitted', submitted_at = now(), submitted_by = auth.uid()
   where id = p_quotation_id
   returning * into v_quote;
  update public.quotation_requests set status = 'responded', responded_at = coalesce(responded_at, now())
   where id = v_quote.quotation_request_id;

  select * into v_batch from public.batches where id = v_quote.batch_id for update;
  if v_batch.status = 'quotation_requested' then
    update public.batches set status = 'quotation_review' where id = v_batch.id;
  end if;

  perform public.log_audit('quotation.submitted', 'dealer_quotation', p_quotation_id::text,
    jsonb_build_object('status', 'draft'), jsonb_build_object('status', 'submitted', 'total_payable', v_quote.total_payable));
  return v_quote;
end;
$$;

create or replace function public.admin_review_quotation(p_quotation_id uuid, p_action text, p_notes text default null)
returns public.dealer_quotations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.dealer_quotations;
  v_new public.dealer_quotations;
  v_batch public.batches;
  v_participants integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into v_old from public.dealer_quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'quotation_not_found';
  end if;

  if p_action = 'start_review' and v_old.status = 'submitted' then
    update public.dealer_quotations set status = 'under_review', reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = coalesce(p_notes, review_notes)
     where id = p_quotation_id returning * into v_new;
  elsif p_action = 'approve' and v_old.status in ('submitted', 'under_review') then
    if v_old.total_payable <= 0 then
      raise exception 'invalid_total';
    end if;
    update public.dealer_quotations set status = 'approved', approved_by = auth.uid(), approved_at = now(),
      reviewed_by = auth.uid(), reviewed_at = now(), review_notes = coalesce(p_notes, review_notes)
     where id = p_quotation_id returning * into v_new;
  elsif p_action = 'request_changes' and v_old.status in ('submitted', 'under_review') then
    if p_notes is null or char_length(trim(p_notes)) < 5 then
      raise exception 'reason_required';
    end if;
    update public.dealer_quotations set status = 'draft', review_notes = p_notes,
      reviewed_by = auth.uid(), reviewed_at = now(), submitted_at = null
     where id = p_quotation_id returning * into v_new;
    perform public.notify_dealer_users(v_old.dealer_id, 'quotation_changes_requested',
      'Changes requested on your quotation', p_notes, '/dealer/quotations/' || p_quotation_id::text,
      'qchanges:' || p_quotation_id::text || ':' || extract(epoch from now())::bigint::text);
  elsif p_action = 'reject' and v_old.status in ('submitted', 'under_review', 'approved') then
    if p_notes is null or char_length(trim(p_notes)) < 5 then
      raise exception 'reason_required';
    end if;
    update public.dealer_quotations set status = 'rejected', rejection_reason = p_notes,
      reviewed_by = auth.uid(), reviewed_at = now()
     where id = p_quotation_id returning * into v_new;
  elsif p_action = 'publish' and v_old.status = 'approved' then
    if v_old.valid_until is null or v_old.valid_until < (now() at time zone 'Asia/Kolkata')::date then
      raise exception 'quotation_expired';
    end if;
    update public.dealer_quotations set status = 'published', published_by = auth.uid(), published_at = now()
     where id = p_quotation_id returning * into v_new;
    select * into v_batch from public.batches where id = v_old.batch_id for update;
    if v_batch.status in ('quotation_requested', 'quotation_review') then
      update public.batches set status = 'quotes_published' where id = v_batch.id;
    end if;
    v_participants := public.notify_batch_participants(v_old.batch_id, 'quotation_published',
      'A reviewed dealer quotation is available',
      'An itemised quotation for "' || v_batch.title || '" has been reviewed and published. '
        || 'Final on-road price, offers, stock and delivery are confirmed by the dealership.',
      'qpub:' || p_quotation_id::text);
  elsif p_action in ('expire', 'withdraw') and v_old.status in ('approved', 'published', 'submitted', 'under_review') then
    if p_notes is null or char_length(trim(p_notes)) < 5 then
      raise exception 'reason_required';
    end if;
    update public.dealer_quotations
       set status = case when p_action = 'expire' then 'expired'::public.quotation_status else 'withdrawn'::public.quotation_status end,
           review_notes = p_notes
     where id = p_quotation_id returning * into v_new;
  else
    raise exception 'invalid_quotation_transition';
  end if;

  perform public.log_audit('quotation.' || p_action, 'dealer_quotation', p_quotation_id::text,
    jsonb_build_object('status', v_old.status), jsonb_build_object('status', v_new.status, 'total_payable', v_new.total_payable),
    p_notes);
  return v_new;
end;
$$;

create or replace function public.dealer_withdraw_quotation(p_quotation_id uuid, p_reason text)
returns public.dealer_quotations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.dealer_quotations;
  v_new public.dealer_quotations;
begin
  select * into v_old from public.dealer_quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'quotation_not_found';
  end if;
  if not public.is_dealer_member(v_old.dealer_id) then
    raise exception 'forbidden';
  end if;
  if v_old.status not in ('draft', 'submitted', 'under_review', 'approved', 'published') then
    raise exception 'invalid_quotation_transition';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'reason_required';
  end if;
  update public.dealer_quotations set status = 'withdrawn', review_notes = 'Withdrawn by dealer: ' || p_reason
   where id = p_quotation_id returning * into v_new;
  perform public.log_audit('quotation.withdrawn_by_dealer', 'dealer_quotation', p_quotation_id::text,
    jsonb_build_object('status', v_old.status), jsonb_build_object('status', v_new.status), p_reason);
  return v_new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Enquiries & bookings
-- -----------------------------------------------------------------------------
create or replace function public.create_enquiry(p_quotation_id uuid, p_message text default null, p_share_phone boolean default true)
returns public.dealer_enquiries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_quote public.dealer_quotations;
  v_profile public.profiles;
  v_enquiry public.dealer_enquiries;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_quote from public.dealer_quotations where id = p_quotation_id;
  if not found or v_quote.status <> 'published' then
    raise exception 'quotation_not_available';
  end if;
  if v_quote.valid_until < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'quotation_expired';
  end if;
  if not exists (select 1 from public.batch_memberships m where m.batch_id = v_quote.batch_id and m.user_id = v_uid
                 and m.status = 'active' and m.eligibility = 'verified') then
    raise exception 'not_a_verified_participant';
  end if;

  select * into v_enquiry from public.dealer_enquiries where quotation_id = p_quotation_id and user_id = v_uid;
  if found then
    return v_enquiry;
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  insert into public.dealer_enquiries (batch_id, quotation_id, dealer_id, user_id, customer_name, customer_phone, customer_email, customer_message)
  values (v_quote.batch_id, p_quotation_id, v_quote.dealer_id, v_uid, coalesce(v_profile.full_name, 'GroupDrive customer'),
          case when p_share_phone then v_profile.phone else null end, v_profile.email, left(p_message, 1000))
  returning * into v_enquiry;

  perform public.notify_dealer_users(v_quote.dealer_id, 'dealer_enquiry_created',
    'New customer enquiry from a GroupDrive group',
    'A verified participant has asked to be contacted about your published quotation.',
    '/dealer/enquiries', 'enquiry:' || v_enquiry.id::text);
  perform public.log_audit('enquiry.created', 'dealer_enquiry', v_enquiry.id::text, null,
    jsonb_build_object('quotation_id', p_quotation_id, 'dealer_id', v_quote.dealer_id));
  return v_enquiry;
end;
$$;

create or replace function public.update_enquiry_status(p_enquiry_id uuid, p_status public.enquiry_status, p_notes text default null)
returns public.dealer_enquiries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.dealer_enquiries;
  v_new public.dealer_enquiries;
  v_is_dealer boolean;
begin
  select * into v_old from public.dealer_enquiries where id = p_enquiry_id for update;
  if not found then
    raise exception 'enquiry_not_found';
  end if;
  v_is_dealer := public.is_dealer_member(v_old.dealer_id);

  if v_old.user_id = auth.uid() and not v_is_dealer then
    if p_status <> 'withdrawn' then
      raise exception 'forbidden';
    end if;
  elsif not (v_is_dealer or public.is_admin()) then
    raise exception 'forbidden';
  elsif p_status in ('booked', 'withdrawn') and not public.is_admin() then
    -- Bookings are recorded via record_booking; withdrawal is the customer's choice.
    raise exception 'forbidden';
  end if;

  if v_old.status in ('booked', 'closed_lost', 'withdrawn') and not public.is_admin() then
    raise exception 'enquiry_closed';
  end if;

  update public.dealer_enquiries
     set status = p_status,
         dealer_notes = case when v_is_dealer or public.is_admin() then coalesce(p_notes, dealer_notes) else dealer_notes end
   where id = p_enquiry_id returning * into v_new;

  if v_new.status is distinct from v_old.status and v_new.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) then
    perform public.enqueue_notification(v_new.user_id, 'dealer_enquiry_updated', 'Update on your dealership enquiry',
      'Your enquiry status is now: ' || replace(v_new.status::text, '_', ' ') || '.',
      '/dashboard/groups/' || v_new.batch_id::text, 'enq_status:' || p_enquiry_id::text || ':' || v_new.status::text);
  end if;
  perform public.log_audit('enquiry.status_changed', 'dealer_enquiry', p_enquiry_id::text,
    jsonb_build_object('status', v_old.status), jsonb_build_object('status', v_new.status));
  return v_new;
end;
$$;

create or replace function public.record_booking(
  p_enquiry_id uuid, p_booking_date date, p_reference text default null, p_expected_delivery date default null)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enq public.dealer_enquiries;
  v_booking public.bookings;
begin
  select * into v_enq from public.dealer_enquiries where id = p_enquiry_id for update;
  if not found then
    raise exception 'enquiry_not_found';
  end if;
  if not (public.is_dealer_member(v_enq.dealer_id) or public.is_admin()) then
    raise exception 'forbidden';
  end if;
  if v_enq.status in ('closed_lost', 'withdrawn') then
    raise exception 'enquiry_closed';
  end if;
  if p_booking_date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'booking_date_in_future';
  end if;

  insert into public.bookings (enquiry_id, dealer_id, user_id, batch_id, booking_reference, booking_date, expected_delivery_date, created_by)
  values (p_enquiry_id, v_enq.dealer_id, v_enq.user_id, v_enq.batch_id, p_reference, p_booking_date, p_expected_delivery, auth.uid())
  on conflict (enquiry_id) do update
    set booking_reference = excluded.booking_reference,
        booking_date = excluded.booking_date,
        expected_delivery_date = excluded.expected_delivery_date
  returning * into v_booking;

  update public.dealer_enquiries set status = 'booked' where id = p_enquiry_id;
  update public.batches set status = 'purchase_in_progress' where id = v_enq.batch_id and status = 'quotes_published';

  perform public.enqueue_notification(v_enq.user_id, 'booking_updated', 'Your booking has been recorded',
    'The dealership recorded a booking for your enquiry. Please confirm details directly with the dealership.',
    '/dashboard/groups/' || v_enq.batch_id::text, 'booking:' || v_booking.id::text);
  perform public.log_audit('booking.recorded', 'booking', v_booking.id::text, null, to_jsonb(v_booking));
  return v_booking;
end;
$$;

create or replace function public.update_booking_status(p_booking_id uuid, p_status public.booking_status, p_notes text default null)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.bookings;
  v_new public.bookings;
begin
  select * into v_old from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;
  if not (public.is_dealer_member(v_old.dealer_id) or public.is_admin()) then
    raise exception 'forbidden';
  end if;
  if v_old.status <> 'booked' and not public.is_admin() then
    raise exception 'booking_closed';
  end if;
  update public.bookings set status = p_status, notes = coalesce(p_notes, notes)
   where id = p_booking_id returning * into v_new;
  perform public.enqueue_notification(v_new.user_id, 'booking_updated', 'Your booking status changed',
    'Booking status: ' || v_new.status::text || '.', '/dashboard/groups/' || v_new.batch_id::text,
    'booking:' || p_booking_id::text || ':' || v_new.status::text);
  perform public.log_audit('booking.status_changed', 'booking', p_booking_id::text,
    jsonb_build_object('status', v_old.status), jsonb_build_object('status', v_new.status));
  return v_new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Sale verification
-- -----------------------------------------------------------------------------
create or replace function public.submit_sale_claim(
  p_enquiry_id uuid,
  p_sale_date date,
  p_invoice_number text default null,
  p_sale_reference text default null,
  p_evidence_paths text[] default '{}')
returns public.sale_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_enq public.dealer_enquiries;
  v_quote public.dealer_quotations;
  v_booking public.bookings;
  v_sale public.sale_verifications;
  v_role public.app_role;
  v_path text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_enq from public.dealer_enquiries where id = p_enquiry_id for update;
  if not found then
    raise exception 'enquiry_not_found';
  end if;

  if public.is_dealer_member(v_enq.dealer_id) then
    v_role := 'dealer';
  elsif v_enq.user_id = v_uid then
    v_role := 'customer';
  else
    raise exception 'forbidden';
  end if;

  if p_sale_date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'sale_date_in_future';
  end if;

  -- Evidence must live in this sale's own storage folder (validated again by storage RLS).
  foreach v_path in array coalesce(p_evidence_paths, '{}') loop
    if v_path !~ ('^' || p_enquiry_id::text || '/[A-Za-z0-9._-]+$') then
      raise exception 'invalid_evidence_path';
    end if;
  end loop;

  select * into v_quote from public.dealer_quotations where id = v_enq.quotation_id;
  select * into v_booking from public.bookings where enquiry_id = p_enquiry_id;

  select * into v_sale from public.sale_verifications where enquiry_id = p_enquiry_id for update;
  if found then
    if v_sale.status in ('verified', 'rejected') then
      raise exception 'sale_already_decided';
    end if;
    update public.sale_verifications
       set evidence_paths = (select array(select distinct unnest(v_sale.evidence_paths || coalesce(p_evidence_paths, '{}')))),
           customer_confirmed_at = case when v_role = 'customer' then coalesce(customer_confirmed_at, now()) else customer_confirmed_at end,
           invoice_number = case when v_role = 'dealer' then coalesce(p_invoice_number, invoice_number) else invoice_number end,
           sale_reference = case when v_role = 'dealer' then coalesce(p_sale_reference, sale_reference) else sale_reference end,
           status = case when status = 'evidence_requested' then 'under_review'::public.sale_status else status end
     where id = v_sale.id returning * into v_sale;
  else
    insert into public.sale_verifications (
      enquiry_id, booking_id, dealer_id, user_id, batch_id, variant_id, claimed_by, claimed_by_role,
      sale_reference, invoice_number, sale_date, evidence_paths, customer_confirmed_at)
    values (
      p_enquiry_id, v_booking.id, v_enq.dealer_id, v_enq.user_id, v_enq.batch_id, v_quote.variant_id, v_uid, v_role,
      p_sale_reference, p_invoice_number, p_sale_date, coalesce(p_evidence_paths, '{}'),
      case when v_role = 'customer' then now() else null end)
    returning * into v_sale;
  end if;

  perform public.log_audit('sale.claimed', 'sale_verification', v_sale.id::text, null,
    jsonb_build_object('role', v_role, 'status', v_sale.status));
  return v_sale;
end;
$$;

-- Picks the most specific active agreement. Dealer-specific agreements win over
-- general ones, then campaign (batch) > variant > model > manufacturer scope.
create or replace function public.find_commission_agreement(
  p_dealer_id uuid, p_batch_id uuid, p_variant_id uuid, p_on date)
returns public.commission_agreements
language sql
stable
security definer
set search_path = ''
as $$
  select ca.*
  from public.commission_agreements ca
  join public.vehicle_variants vv on vv.id = p_variant_id
  join public.vehicles v on v.id = vv.vehicle_id
  where ca.status = 'active'
    and ca.effective_from <= p_on
    and (ca.effective_to is null or ca.effective_to >= p_on)
    and (ca.dealer_id is null or ca.dealer_id = p_dealer_id)
    and (ca.batch_id is null or ca.batch_id = p_batch_id)
    and (ca.variant_id is null or ca.variant_id = p_variant_id)
    and (ca.vehicle_id is null or ca.vehicle_id = v.id)
    and (ca.manufacturer_id is null or ca.manufacturer_id = v.manufacturer_id)
  order by
    (case when ca.dealer_id is not null then 32 else 0 end
     + case when ca.batch_id is not null then 16 else 0 end
     + case when ca.variant_id is not null then 8 else 0 end
     + case when ca.vehicle_id is not null then 4 else 0 end
     + case when ca.manufacturer_id is not null then 2 else 0 end) desc,
    ca.effective_from desc,
    ca.created_at desc
  limit 1;
$$;

create or replace function public.calculate_commission_amount(
  p_calc_type public.commission_calc_type, p_fixed numeric, p_percentage numeric, p_basis numeric, p_cap numeric)
returns numeric
language plpgsql
immutable
as $$
declare
  v_amount numeric;
begin
  if p_calc_type = 'fixed' then
    v_amount := p_fixed;
  else
    if p_basis is null or p_basis < 0 then
      raise exception 'basis_amount_required';
    end if;
    v_amount := round(p_basis * p_percentage / 100, 2);
  end if;
  if p_cap is not null then
    v_amount := least(v_amount, p_cap);
  end if;
  return round(v_amount, 2);
end;
$$;

create or replace function public.admin_create_commission(p_sale_id uuid, p_basis_amount numeric default null)
returns public.commissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sale_verifications;
  v_agreement public.commission_agreements;
  v_commission public.commissions;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into v_sale from public.sale_verifications where id = p_sale_id;
  if not found then
    raise exception 'sale_not_found';
  end if;
  if v_sale.status <> 'verified' then
    raise exception 'sale_not_verified';
  end if;
  select * into v_commission from public.commissions where sale_verification_id = p_sale_id;
  if found then
    return v_commission;
  end if;

  v_agreement := public.find_commission_agreement(v_sale.dealer_id, v_sale.batch_id, v_sale.variant_id, v_sale.sale_date);
  if v_agreement.id is null then
    raise exception 'no_active_agreement';
  end if;

  insert into public.commissions (
    sale_verification_id, dealer_id, batch_id, variant_id, agreement_id, sale_reference,
    verified_completion_date, calc_type, basis_label, basis_amount, rate_percentage, fixed_amount,
    calculated_amount, created_by)
  values (
    p_sale_id, v_sale.dealer_id, v_sale.batch_id, v_sale.variant_id, v_agreement.id,
    coalesce(v_sale.sale_reference, v_sale.invoice_number),
    (v_sale.verified_at at time zone 'Asia/Kolkata')::date, v_agreement.calc_type, v_agreement.basis_label,
    case when v_agreement.calc_type = 'percentage' then p_basis_amount else null end,
    v_agreement.percentage, v_agreement.fixed_amount,
    public.calculate_commission_amount(v_agreement.calc_type, v_agreement.fixed_amount, v_agreement.percentage,
      p_basis_amount, v_agreement.cap_amount),
    auth.uid())
  returning * into v_commission;

  perform public.log_audit('commission.created', 'commission', v_commission.id::text, null,
    jsonb_build_object('agreement_id', v_agreement.id, 'calculated_amount', v_commission.calculated_amount,
      'basis_amount', v_commission.basis_amount));
  return v_commission;
end;
$$;

create or replace function public.admin_review_sale(
  p_sale_id uuid, p_action text, p_note text default null, p_basis_amount numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.sale_verifications;
  v_new public.sale_verifications;
  v_commission public.commissions;
  v_commission_error text;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into v_old from public.sale_verifications where id = p_sale_id for update;
  if not found then
    raise exception 'sale_not_found';
  end if;
  -- Conflict of interest: dealer staff can never verify their own dealership's sales.
  if public.is_dealer_member(v_old.dealer_id) then
    raise exception 'conflict_of_interest';
  end if;
  if v_old.status in ('verified', 'rejected') then
    raise exception 'sale_already_decided';
  end if;

  if p_action = 'request_evidence' then
    if p_note is null or char_length(trim(p_note)) < 5 then
      raise exception 'reason_required';
    end if;
    update public.sale_verifications set status = 'evidence_requested', evidence_request_note = p_note
     where id = p_sale_id returning * into v_new;
    perform public.enqueue_notification(v_old.user_id, 'purchase_verification_requested',
      'Please help us verify your purchase', p_note, '/dashboard/groups/' || v_old.batch_id::text,
      'sale_evidence:' || p_sale_id::text || ':' || extract(epoch from now())::bigint::text);
    perform public.notify_dealer_users(v_old.dealer_id, 'purchase_verification_requested',
      'Evidence requested for a sale claim', p_note, '/dealer/sales',
      'sale_evidence:' || p_sale_id::text || ':' || extract(epoch from now())::bigint::text);
  elsif p_action = 'start_review' then
    update public.sale_verifications set status = 'under_review' where id = p_sale_id returning * into v_new;
  elsif p_action = 'reject' then
    if p_note is null or char_length(trim(p_note)) < 5 then
      raise exception 'reason_required';
    end if;
    update public.sale_verifications set status = 'rejected', rejected_reason = p_note, admin_notes = p_note
     where id = p_sale_id returning * into v_new;
  elsif p_action = 'verify' then
    update public.sale_verifications set status = 'verified', verified_by = auth.uid(), verified_at = now(),
      admin_notes = coalesce(p_note, admin_notes)
     where id = p_sale_id returning * into v_new;
    update public.bookings set status = 'delivered' where id = v_new.booking_id and status = 'booked';
    begin
      v_commission := public.admin_create_commission(p_sale_id, p_basis_amount);
    exception when others then
      v_commission_error := sqlerrm;
    end;
  else
    raise exception 'invalid_action';
  end if;

  perform public.log_audit('sale.' || p_action, 'sale_verification', p_sale_id::text,
    jsonb_build_object('status', v_old.status), jsonb_build_object('status', v_new.status), p_note);
  return jsonb_build_object('status', v_new.status, 'commission_id', v_commission.id,
    'commission_error', v_commission_error);
end;
$$;

-- -----------------------------------------------------------------------------
-- Commission administration
-- -----------------------------------------------------------------------------
create or replace function public.commission_transition_allowed(p_from public.commission_status, p_to public.commission_status)
returns boolean
language sql
immutable
as $$
  select case p_from
    when 'pending' then p_to in ('invoiced', 'payable', 'disputed', 'cancelled')
    when 'invoiced' then p_to in ('payable', 'paid', 'disputed', 'cancelled')
    when 'payable' then p_to in ('paid', 'disputed', 'cancelled')
    when 'disputed' then p_to in ('pending', 'invoiced', 'payable', 'cancelled')
    else false -- paid and cancelled are terminal
  end;
$$;

create or replace function public.admin_update_commission(
  p_commission_id uuid,
  p_status public.commission_status,
  p_invoice_reference text default null,
  p_payment_date date default null,
  p_payment_reference text default null,
  p_note text default null)
returns public.commissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.commissions;
  v_new public.commissions;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into v_old from public.commissions where id = p_commission_id for update;
  if not found then
    raise exception 'commission_not_found';
  end if;
  if public.is_dealer_member(v_old.dealer_id) then
    raise exception 'conflict_of_interest';
  end if;
  if p_status <> v_old.status and not public.commission_transition_allowed(v_old.status, p_status) then
    raise exception 'invalid_commission_transition';
  end if;
  if p_status = 'paid' and p_payment_date is null then
    raise exception 'payment_date_required';
  end if;
  if p_status in ('disputed', 'cancelled') and (p_note is null or char_length(trim(p_note)) < 5) then
    raise exception 'reason_required';
  end if;

  update public.commissions
     set status = p_status,
         invoice_reference = coalesce(p_invoice_reference, invoice_reference),
         payment_date = case when p_status = 'paid' then p_payment_date else payment_date end,
         payment_reference = coalesce(p_payment_reference, payment_reference),
         dispute_status = case
           when p_status = 'disputed' then 'open'::public.dispute_status
           when v_old.status = 'disputed' then 'resolved'::public.dispute_status
           else dispute_status end,
         dispute_notes = case when p_status = 'disputed' or v_old.status = 'disputed'
           then coalesce(dispute_notes || E'\n', '') || to_char(now(), 'YYYY-MM-DD') || ': ' || coalesce(p_note, '')
           else dispute_notes end
   where id = p_commission_id returning * into v_new;

  perform public.log_audit('commission.updated', 'commission', p_commission_id::text,
    jsonb_build_object('status', v_old.status, 'invoice_reference', v_old.invoice_reference, 'payment_date', v_old.payment_date),
    jsonb_build_object('status', v_new.status, 'invoice_reference', v_new.invoice_reference, 'payment_date', v_new.payment_date),
    p_note);
  return v_new;
end;
$$;

create or replace function public.admin_adjust_commission(p_commission_id uuid, p_adjustment numeric, p_reason text)
returns public.commissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.commissions;
  v_new public.commissions;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'reason_required';
  end if;
  select * into v_old from public.commissions where id = p_commission_id for update;
  if not found then
    raise exception 'commission_not_found';
  end if;
  if v_old.status in ('paid', 'cancelled') then
    raise exception 'commission_locked';
  end if;
  if v_old.calculated_amount + p_adjustment < 0 then
    raise exception 'invalid_adjustment';
  end if;
  update public.commissions set adjustment_amount = round(p_adjustment, 2), adjustment_reason = p_reason
   where id = p_commission_id returning * into v_new;
  perform public.log_audit('commission.adjusted', 'commission', p_commission_id::text,
    jsonb_build_object('adjustment_amount', v_old.adjustment_amount, 'final_amount', v_old.final_amount),
    jsonb_build_object('adjustment_amount', v_new.adjustment_amount, 'final_amount', v_new.final_amount), p_reason);
  return v_new;
end;
$$;

-- -----------------------------------------------------------------------------
-- User & role administration
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_user_suspension(p_user_id uuid, p_suspend boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_modify_self';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'reason_required';
  end if;
  update public.profiles
     set is_suspended = p_suspend,
         suspended_reason = case when p_suspend then p_reason else null end,
         suspended_at = case when p_suspend then now() else null end
   where id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;
  perform public.log_audit(case when p_suspend then 'user.suspended' else 'user.reinstated' end,
    'profile', p_user_id::text, null, jsonb_build_object('is_suspended', p_suspend), p_reason);
end;
$$;

create or replace function public.admin_set_role(p_user_id uuid, p_role public.app_role, p_grant boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() and p_role = 'admin' and not p_grant then
    raise exception 'cannot_modify_self';
  end if;
  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (p_user_id, p_role, auth.uid())
    on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = p_role;
  end if;
  perform public.log_audit(case when p_grant then 'role.granted' else 'role.revoked' end,
    'profile', p_user_id::text, null, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_mark_phone_verified(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'reason_required';
  end if;
  update public.profiles set phone_verified_at = now() where id = p_user_id and phone is not null;
  if not found then
    raise exception 'phone_missing';
  end if;
  perform public.log_audit('user.phone_verified_manually', 'profile', p_user_id::text, null, null, p_reason);
end;
$$;

create or replace function public.admin_link_dealer_user(p_dealer_id uuid, p_email text, p_job_title text default null)
returns public.dealer_users
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_row public.dealer_users;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select id into v_user from public.profiles where email = p_email::extensions.citext;
  if v_user is null then
    raise exception 'user_not_found';
  end if;
  insert into public.dealer_users (dealer_id, user_id, job_title, created_by)
  values (p_dealer_id, v_user, p_job_title, auth.uid())
  on conflict (dealer_id, user_id) do update set is_active = true, job_title = coalesce(excluded.job_title, public.dealer_users.job_title)
  returning * into v_row;
  insert into public.user_roles (user_id, role, granted_by) values (v_user, 'dealer', auth.uid())
  on conflict do nothing;
  perform public.log_audit('dealer_user.linked', 'dealer', p_dealer_id::text, null,
    jsonb_build_object('user_id', v_user));
  return v_row;
end;
$$;

create or replace function public.admin_unlink_dealer_user(p_dealer_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.dealer_users;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.dealer_users set is_active = false where id = p_dealer_user_id returning * into v_row;
  if not found then
    raise exception 'not_found';
  end if;
  if not exists (select 1 from public.dealer_users where user_id = v_row.user_id and is_active) then
    delete from public.user_roles where user_id = v_row.user_id and role = 'dealer';
  end if;
  perform public.log_audit('dealer_user.unlinked', 'dealer', v_row.dealer_id::text, null,
    jsonb_build_object('user_id', v_row.user_id));
end;
$$;

create or replace function public.admin_set_dealer_authorization(p_dealer_id uuid, p_status public.dealer_auth_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.dealers;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into v_old from public.dealers where id = p_dealer_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  update public.dealers
     set authorization_status = p_status,
         authorization_verified_at = case when p_status = 'verified' then now() else authorization_verified_at end,
         authorization_verified_by = case when p_status = 'verified' then auth.uid() else authorization_verified_by end
   where id = p_dealer_id;
  perform public.log_audit('dealer.authorization_changed', 'dealer', p_dealer_id::text,
    jsonb_build_object('authorization_status', v_old.authorization_status),
    jsonb_build_object('authorization_status', p_status), p_reason);
end;
$$;

-- Bootstrap the first administrator from the SQL editor (runs as postgres).
-- Not executable by anon/authenticated users.
create or replace function public.grant_admin_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users where email = p_email;
  if v_user is null then
    raise exception 'user_not_found: sign up with this email first';
  end if;
  insert into public.user_roles (user_id, role) values (v_user, 'admin') on conflict do nothing;
  perform public.log_audit('role.granted_bootstrap', 'profile', v_user::text, null, jsonb_build_object('role', 'admin'));
  return v_user;
end;
$$;

-- -----------------------------------------------------------------------------
-- Abuse protection: fixed-window rate limiting (server-side only)
-- -----------------------------------------------------------------------------
create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  -- Opportunistic cleanup of old windows.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_limit;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reporting
-- -----------------------------------------------------------------------------
create or replace function public.admin_dashboard_metrics(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := coalesce(p_from, '-infinity'::timestamptz);
  v_to timestamptz := coalesce(p_to, 'infinity'::timestamptz);
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'registered_users', (select count(*) from public.profiles where created_at between v_from and v_to),
    'verified_participants', (select count(*) from public.batch_memberships
       where status = 'active' and eligibility = 'verified' and joined_at between v_from and v_to),
    'unique_verified_participants', (select count(distinct user_id) from public.batch_memberships
       where status = 'active' and eligibility = 'verified' and joined_at between v_from and v_to),
    'intent_confirmed', (select count(*) from public.purchase_intent_confirmations
       where status = 'confirmed' and responded_at between v_from and v_to),
    'open_batches', (select count(*) from public.batches where status = 'open'),
    'batches_target_reached', (select count(*) from public.batches where close_reason = 'target_reached'
       and closed_at between v_from and v_to),
    'batches_awaiting_quotes', (select count(*) from public.batches
       where status in ('target_reached', 'closed_deadline', 'quotation_requested', 'quotation_review')),
    'approved_quotations', (select count(*) from public.dealer_quotations
       where status in ('approved', 'published') and approved_at between v_from and v_to),
    'dealer_enquiries', (select count(*) from public.dealer_enquiries where created_at between v_from and v_to),
    'bookings', (select count(*) from public.bookings where status <> 'cancelled' and created_at between v_from and v_to),
    'verified_sales', (select count(*) from public.sale_verifications where status = 'verified'
       and verified_at between v_from and v_to),
    'pending_sale_claims', (select count(*) from public.sale_verifications
       where status in ('claimed', 'evidence_requested', 'under_review')),
    'confirmed_commissions', (select coalesce(sum(final_amount), 0) from public.commissions
       where status <> 'cancelled' and created_at between v_from and v_to),
    'pending_commission_payments', (select coalesce(sum(final_amount), 0) from public.commissions
       where status in ('pending', 'invoiced', 'payable', 'disputed')),
    'paid_commissions', (select coalesce(sum(final_amount), 0) from public.commissions
       where status = 'paid' and payment_date between v_from::date and v_to::date)
  );
end;
$$;

create or replace function public.admin_chart_series(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'participation', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'joins', j, 'verified', vj) order by d)
      from (
        select (m.joined_at at time zone 'Asia/Kolkata')::date as d,
               count(*) as j,
               count(*) filter (where m.eligibility = 'verified') as vj
        from public.batch_memberships m
        where m.joined_at between p_from and p_to
        group by 1
      ) s), '[]'::jsonb),
    'funnel', jsonb_build_array(
      jsonb_build_object('stage', 'Verified participants', 'value',
        (select count(*) from public.batch_memberships where status = 'active' and eligibility = 'verified' and joined_at between p_from and p_to)),
      jsonb_build_object('stage', 'Intent confirmed', 'value',
        (select count(*) from public.purchase_intent_confirmations where status = 'confirmed' and responded_at between p_from and p_to)),
      jsonb_build_object('stage', 'Dealer enquiries', 'value',
        (select count(*) from public.dealer_enquiries where created_at between p_from and p_to)),
      jsonb_build_object('stage', 'Bookings', 'value',
        (select count(*) from public.bookings where status <> 'cancelled' and created_at between p_from and p_to)),
      jsonb_build_object('stage', 'Verified sales', 'value',
        (select count(*) from public.sale_verifications where status = 'verified' and verified_at between p_from and p_to))
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('category', c, 'participants', n))
      from (
        select v.category::text as c, count(*) as n
        from public.batch_memberships m
        join public.batches b on b.id = m.batch_id
        join public.vehicle_variants vv on vv.id = b.variant_id
        join public.vehicles v on v.id = vv.vehicle_id
        where m.status = 'active' and m.eligibility = 'verified' and m.joined_at between p_from and p_to
        group by 1
      ) s), '[]'::jsonb),
    'sales', coalesce((
      select jsonb_agg(jsonb_build_object('month', mth, 'sales', n, 'commission', amt) order by mth)
      from (
        select to_char(sv.verified_at at time zone 'Asia/Kolkata', 'YYYY-MM') as mth,
               count(*) as n,
               coalesce(sum(c.final_amount), 0) as amt
        from public.sale_verifications sv
        left join public.commissions c on c.sale_verification_id = sv.id and c.status <> 'cancelled'
        where sv.status = 'verified' and sv.verified_at between p_from and p_to
        group by 1
      ) s), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_batch_funnel(p_batch_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'members_total', (select count(*) from public.batch_memberships where batch_id = p_batch_id),
    'active_members', (select count(*) from public.batch_memberships where batch_id = p_batch_id and status = 'active'),
    'pending_verification', (select count(*) from public.batch_memberships where batch_id = p_batch_id and status = 'active' and eligibility = 'pending_verification'),
    'verified_participants', (select count(*) from public.batch_memberships where batch_id = p_batch_id and status = 'active' and eligibility = 'verified'),
    'ineligible', (select count(*) from public.batch_memberships where batch_id = p_batch_id and eligibility = 'ineligible'),
    'withdrawn', (select count(*) from public.batch_memberships where batch_id = p_batch_id and status = 'withdrawn'),
    'intent_requested', (select count(*) from public.purchase_intent_confirmations where batch_id = p_batch_id),
    'intent_confirmed', (select count(*) from public.purchase_intent_confirmations where batch_id = p_batch_id and status = 'confirmed'),
    'enquiries', (select count(*) from public.dealer_enquiries where batch_id = p_batch_id),
    'bookings', (select count(*) from public.bookings where batch_id = p_batch_id and status <> 'cancelled'),
    'verified_sales', (select count(*) from public.sale_verifications where batch_id = p_batch_id and status = 'verified')
  );
end;
$$;
