-- =============================================================================
-- Security hardening (2026-10-31 audit)
--
-- 1. find_commission_agreement() exposed every dealer's commission terms to any
--    signed-in user through /rest/v1/rpc. Only other SECURITY DEFINER functions
--    (which run as the owner) call it, so signed-in users lose EXECUTE.
-- 2. submit_lead() / submit_contact_message() are public on purpose (anonymous
--    enquiry forms) and rate-limit per phone / email, but a script calling the
--    REST endpoint directly could rotate numbers or addresses. Add a site-wide
--    hourly ceiling so a flood cannot fill the tables or the admin inbox, and cap
--    free-text lengths.
-- =============================================================================

revoke execute on function public.find_commission_agreement(uuid, uuid, uuid, date) from public, anon, authenticated;

create or replace function public.submit_lead(p_kind text, p_name text, p_phone text, p_city text default null,
                                              p_vehicle_id uuid default null, p_variant_id uuid default null,
                                              p_message text default null, p_email text default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_id uuid;
begin
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then v_phone := right(v_phone, 10); end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'invalid_phone' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 120 then raise exception 'invalid_name' using errcode = '22023'; end if;
  if not public.consume_rate_limit('lead:' || v_phone, 6, 3600) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  if not public.consume_rate_limit('lead:all', 500, 3600) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  if p_variant_id is not null and p_vehicle_id is not null and not exists (
    select 1 from public.vehicle_variants where id = p_variant_id and vehicle_id = p_vehicle_id
  ) then raise exception 'invalid_variant' using errcode = '22023'; end if;
  insert into public.leads (kind, name, phone, email, city, vehicle_id, variant_id, message, user_id)
  values (p_kind, btrim(p_name), v_phone, left(nullif(btrim(coalesce(p_email, '')), ''), 254),
          left(nullif(btrim(coalesce(p_city, '')), ''), 80), p_vehicle_id, p_variant_id,
          left(nullif(btrim(coalesce(p_message, '')), ''), 2000), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.submit_contact_message(p_name text, p_email text, p_phone text, p_subject text, p_message text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if not public.consume_rate_limit('contact:' || v_email, 5, 3600) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  if not public.consume_rate_limit('contact:all', 200, 3600) then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  insert into public.contact_messages (name, email, phone, subject, message, user_id)
  values (btrim(p_name), v_email, left(nullif(btrim(coalesce(p_phone, '')), ''), 20), left(btrim(p_subject), 200),
          left(btrim(p_message), 5000), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
