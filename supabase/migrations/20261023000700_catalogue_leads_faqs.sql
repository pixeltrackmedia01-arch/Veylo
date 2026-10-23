-- =============================================================================
-- Richer car catalogue (summary, colours, warranty, features), customer leads,
-- saved vehicles (wishlist) and FAQ improvements.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catalogue details
-- -----------------------------------------------------------------------------
alter table public.vehicles
  add column summary text,
  -- [{"name": "Stealth Black", "hex": "#111111"}, ...]
  add column colours jsonb not null default '[]'::jsonb check (jsonb_typeof(colours) = 'array'),
  add column warranty text,
  -- Higher shows first in "Popularity" sort.
  add column popularity integer not null default 0,
  add column launched_on date;

alter table public.vehicle_variants
  -- {"Safety": ["6 airbags", ...], "Comfort": [...], ...}
  add column features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object');

-- -----------------------------------------------------------------------------
-- Leads: on-road price, test drive, call back, loan, insurance, best price
-- -----------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('on_road_price', 'test_drive', 'callback', 'car_loan', 'insurance', 'best_price')),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email extensions.citext,
  city text check (city is null or char_length(city) <= 80),
  vehicle_id uuid references public.vehicles (id) on delete set null,
  variant_id uuid references public.vehicle_variants (id) on delete set null,
  message text check (message is null or char_length(message) <= 1000),
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_created_idx on public.leads (created_at desc);
create index leads_vehicle_idx on public.leads (vehicle_id);
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
grant select on public.leads to authenticated;
grant update (status) on public.leads to authenticated;
create policy leads_admin_read on public.leads for select to authenticated using (public.is_admin());
create policy leads_admin_update on public.leads for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Visitors submit leads through this function only (no direct insert grant), so
-- it works without the service-role key and is rate limited per phone number.
create or replace function public.submit_lead(
  p_kind text,
  p_name text,
  p_phone text,
  p_city text default null,
  p_vehicle_id uuid default null,
  p_variant_id uuid default null,
  p_message text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_id uuid;
begin
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then
    v_phone := right(v_phone, 10);
  end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if not public.consume_rate_limit('lead:' || v_phone, 6, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if p_variant_id is not null and p_vehicle_id is not null and not exists (
    select 1 from public.vehicle_variants where id = p_variant_id and vehicle_id = p_vehicle_id
  ) then
    raise exception 'invalid_variant' using errcode = '22023';
  end if;

  insert into public.leads (kind, name, phone, email, city, vehicle_id, variant_id, message, user_id)
  values (
    p_kind, btrim(p_name), v_phone, nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''), p_vehicle_id, p_variant_id,
    nullif(btrim(coalesce(p_message, '')), ''), auth.uid()
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_lead(text, text, text, text, uuid, uuid, text, text) from public;
grant execute on function public.submit_lead(text, text, text, text, uuid, uuid, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Saved vehicles (wishlist)
-- -----------------------------------------------------------------------------
create table public.saved_vehicles (
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);
alter table public.saved_vehicles enable row level security;
grant select, insert, delete on public.saved_vehicles to authenticated;
create policy saved_vehicles_own on public.saved_vehicles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- FAQs: per-vehicle questions, home-page featuring, anchors and feedback
-- -----------------------------------------------------------------------------
alter table public.faqs
  add column vehicle_id uuid references public.vehicles (id) on delete cascade,
  add column featured boolean not null default false,
  add column slug text check (slug is null or slug ~ '^[a-z0-9-]+$'),
  add column helpful_count integer not null default 0,
  add column not_helpful_count integer not null default 0;
create unique index faqs_slug_idx on public.faqs (slug) where slug is not null;
create index faqs_vehicle_idx on public.faqs (vehicle_id) where vehicle_id is not null;

-- Visitors update the counters only through faq_feedback().
create or replace function public.faq_feedback(p_faq_id uuid, p_helpful boolean, p_client_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- One vote per question per browser per day.
  if not public.consume_rate_limit('faq:' || p_faq_id || ':' || left(coalesce(p_client_key, ''), 64), 1, 86400) then
    return;
  end if;
  update public.faqs
     set helpful_count = helpful_count + case when p_helpful then 1 else 0 end,
         not_helpful_count = not_helpful_count + case when p_helpful then 0 else 1 end
   where id = p_faq_id and is_published;
end;
$$;
revoke all on function public.faq_feedback(uuid, boolean, text) from public;
grant execute on function public.faq_feedback(uuid, boolean, text) to anon, authenticated;
