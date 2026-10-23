-- =============================================================================
-- GroupDrive — core schema
-- Tables, enums, constraints and indexes. Business functions live in
-- 20261023000200_business_logic.sql, RLS in 20261023000300_rls.sql.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('customer', 'dealer', 'admin');
create type public.vehicle_category as enum ('car', 'two_wheeler');
create type public.publish_status as enum ('draft', 'published', 'unpublished', 'archived');
create type public.purchase_timeline as enum ('immediately', 'within_1_month', 'within_3_months', 'within_6_months', 'exploring');

create type public.batch_status as enum (
  'draft', 'open', 'target_reached', 'closed_deadline', 'quotation_requested',
  'quotation_review', 'quotes_published', 'purchase_in_progress', 'completed',
  'cancelled', 'expired'
);
create type public.membership_status as enum ('active', 'withdrawn', 'removed');
create type public.membership_eligibility as enum ('pending_verification', 'verified', 'ineligible');
create type public.intent_status as enum ('requested', 'confirmed', 'declined');

create type public.dealer_auth_status as enum ('pending', 'verified', 'rejected', 'suspended');
create type public.quotation_request_status as enum ('pending', 'sent', 'responded', 'declined', 'cancelled');
create type public.quotation_status as enum (
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'published', 'expired', 'withdrawn'
);
create type public.line_item_category as enum (
  'ex_showroom', 'registration_road_tax', 'insurance', 'accessories',
  'extended_warranty', 'other_charge', 'discount'
);

create type public.enquiry_status as enum (
  'new', 'contacted', 'test_drive_scheduled', 'negotiating', 'booked', 'closed_lost', 'withdrawn'
);
create type public.booking_status as enum ('booked', 'cancelled', 'delivered');
create type public.sale_status as enum ('claimed', 'evidence_requested', 'under_review', 'verified', 'rejected');
create type public.commission_calc_type as enum ('fixed', 'percentage');
create type public.agreement_status as enum ('draft', 'active', 'inactive');
create type public.commission_status as enum ('pending', 'invoiced', 'payable', 'paid', 'disputed', 'cancelled');
create type public.dispute_status as enum ('none', 'open', 'resolved');
create type public.notification_status as enum ('pending', 'sent', 'failed', 'skipped');
create type public.notification_channel as enum ('email', 'in_app');

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cities (Surat at launch; more can be enabled later without code changes)
-- -----------------------------------------------------------------------------
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  state text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Application settings (admin-editable key/value)
-- -----------------------------------------------------------------------------
create table public.app_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Profiles & roles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  email extensions.citext,
  phone text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  city_id uuid references public.cities (id),
  preferred_category public.vehicle_category,
  purchase_timeline public.purchase_timeline,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  notify_email boolean not null default true,
  notify_batch_updates boolean not null default true,
  notify_marketing boolean not null default false,
  is_suspended boolean not null default false,
  suspended_reason text,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_city_idx on public.profiles (city_id);
create index profiles_email_idx on public.profiles (email);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_idx on public.user_roles (user_id);

-- -----------------------------------------------------------------------------
-- Vehicle catalogue
-- -----------------------------------------------------------------------------
create table public.manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  categories public.vehicle_category[] not null default '{}',
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.manufacturers (id),
  model_name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category public.vehicle_category not null,
  body_type text,
  description text,
  highlights text[] not null default '{}',
  status public.publish_status not null default 'draft',
  is_demo boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manufacturer_id, model_name)
);
create index vehicles_status_category_idx on public.vehicles (status, category);
create index vehicles_manufacturer_idx on public.vehicles (manufacturer_id);

create table public.vehicle_variants (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  fuel_type text check (fuel_type in ('petrol', 'diesel', 'cng', 'electric', 'hybrid', 'petrol_cng')),
  transmission text check (transmission in ('manual', 'automatic', 'amt', 'cvt', 'dct', 'not_applicable')),
  engine_cc integer check (engine_cc is null or engine_cc > 0),
  -- Verified specifications only (e.g. {"power": "88 bhp", "seating": 5}).
  specifications jsonb not null default '{}'::jsonb,
  specs_source text,
  specs_verified_at date,
  status public.publish_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, slug),
  unique (vehicle_id, name)
);
create index vehicle_variants_vehicle_idx on public.vehicle_variants (vehicle_id);

create table public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  variant_id uuid references public.vehicle_variants (id) on delete cascade,
  storage_path text,
  external_url text,
  alt_text text not null,
  attribution text,
  is_placeholder boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create index vehicle_images_vehicle_idx on public.vehicle_images (vehicle_id, sort_order);

-- Admin-verified price references. on_road_total is always derived, never entered.
create table public.vehicle_prices (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.vehicle_variants (id) on delete cascade,
  city_id uuid not null references public.cities (id),
  ex_showroom numeric(12, 2) not null check (ex_showroom > 0),
  registration_road_tax numeric(12, 2) not null default 0 check (registration_road_tax >= 0),
  insurance numeric(12, 2) not null default 0 check (insurance >= 0),
  accessories numeric(12, 2) not null default 0 check (accessories >= 0),
  extended_warranty numeric(12, 2) not null default 0 check (extended_warranty >= 0),
  other_charges numeric(12, 2) not null default 0 check (other_charges >= 0),
  on_road_total numeric(12, 2) generated always as (
    ex_showroom + registration_road_tax + insurance + accessories + extended_warranty + other_charges
  ) stored,
  -- Indicative (published list price) vs verified (confirmed with an authorised dealer).
  price_kind text not null default 'indicative' check (price_kind in ('indicative', 'verified')),
  source text not null check (char_length(source) > 0),
  source_url text,
  verified_at date not null,
  valid_until date,
  is_current boolean not null default true,
  is_demo boolean not null default false,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= verified_at)
);
create index vehicle_prices_variant_city_idx on public.vehicle_prices (variant_id, city_id, is_current);
-- At most one current price reference per variant & city.
create unique index vehicle_prices_one_current_idx
  on public.vehicle_prices (variant_id, city_id) where is_current;

-- -----------------------------------------------------------------------------
-- Dealers
-- -----------------------------------------------------------------------------
create table public.dealers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  branch_address text not null,
  city_id uuid not null references public.cities (id),
  contact_person text,
  business_email extensions.citext,
  business_phone text,
  authorization_status public.dealer_auth_status not null default 'pending',
  authorization_verified_at timestamptz,
  authorization_verified_by uuid references auth.users (id),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dealers_city_idx on public.dealers (city_id, is_active, authorization_status);

-- Internal notes live in their own admin-only table so dealer rows can be shown
-- to dealer staff and quoted customers without leaking internal remarks.
create table public.dealer_admin_notes (
  dealer_id uuid primary key references public.dealers (id) on delete cascade,
  notes text not null default '',
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dealer_brands (
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  manufacturer_id uuid not null references public.manufacturers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (dealer_id, manufacturer_id)
);
create index dealer_brands_manufacturer_idx on public.dealer_brands (manufacturer_id);

create table public.dealer_users (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  job_title text,
  is_active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dealer_id, user_id)
);
create index dealer_users_user_idx on public.dealer_users (user_id) where is_active;

-- -----------------------------------------------------------------------------
-- Group-buying batches
-- -----------------------------------------------------------------------------
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  variant_id uuid not null references public.vehicle_variants (id),
  city_id uuid not null references public.cities (id),
  title text not null,
  delivery_area text not null,
  eligibility_rules text,
  target_participants integer not null default 20 check (target_participants between 2 and 500),
  -- Fewer verified participants than this at the deadline -> batch expires.
  minimum_participants integer not null default 5 check (minimum_participants >= 1),
  deadline timestamptz not null,
  status public.batch_status not null default 'draft',
  -- Maintained exclusively by trusted database functions.
  verified_participant_count integer not null default 0 check (verified_participant_count >= 0),
  opened_at timestamptz,
  closed_at timestamptz,
  close_reason text check (close_reason in ('target_reached', 'deadline', 'manual')),
  cancelled_reason text,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_participants <= target_participants)
);
create index batches_status_deadline_idx on public.batches (status, deadline);
create index batches_variant_idx on public.batches (variant_id);
create index batches_city_idx on public.batches (city_id);

create table public.batch_deadline_extensions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  previous_deadline timestamptz not null,
  new_deadline timestamptz not null,
  reason text not null check (char_length(reason) >= 5),
  extended_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  check (new_deadline > previous_deadline)
);

create table public.batch_memberships (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.membership_status not null default 'active',
  eligibility public.membership_eligibility not null default 'pending_verification',
  ineligible_reason text,
  joined_at timestamptz not null default now(),
  verified_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A user can hold exactly one membership per batch.
  unique (batch_id, user_id)
);
create index batch_memberships_user_idx on public.batch_memberships (user_id);
create index batch_memberships_count_idx on public.batch_memberships (batch_id, status, eligibility);

create table public.purchase_intent_confirmations (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null unique references public.batch_memberships (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.intent_status not null default 'requested',
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  respond_by timestamptz,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchase_intent_batch_idx on public.purchase_intent_confirmations (batch_id, status);
create index purchase_intent_user_idx on public.purchase_intent_confirmations (user_id);

-- -----------------------------------------------------------------------------
-- Quotations
-- -----------------------------------------------------------------------------
create table public.quotation_requests (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  dealer_id uuid not null references public.dealers (id),
  status public.quotation_request_status not null default 'pending',
  requested_at timestamptz not null default now(),
  response_due_at timestamptz,
  responded_at timestamptz,
  participant_count_snapshot integer not null default 0,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Idempotency: one request per dealer per batch, no matter how often closure runs.
  unique (batch_id, dealer_id)
);
create index quotation_requests_dealer_idx on public.quotation_requests (dealer_id, status);

create table public.dealer_quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_request_id uuid not null references public.quotation_requests (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  dealer_id uuid not null references public.dealers (id),
  variant_id uuid not null references public.vehicle_variants (id),
  status public.quotation_status not null default 'draft',
  quote_reference text,
  -- Derived from line items by trigger; never accepted from clients.
  total_payable numeric(12, 2) not null default 0,
  total_discount numeric(12, 2) not null default 0,
  valid_until date,
  conditions text,
  availability_note text,
  delivery_timeline text,
  document_path text,
  submitted_by uuid references auth.users (id),
  submitted_at timestamptz,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  review_notes text,
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  published_by uuid references auth.users (id),
  published_at timestamptz,
  rejection_reason text,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quotation_request_id)
);
create index dealer_quotations_batch_idx on public.dealer_quotations (batch_id, status);
create index dealer_quotations_dealer_idx on public.dealer_quotations (dealer_id, status);

create table public.quotation_line_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.dealer_quotations (id) on delete cascade,
  category public.line_item_category not null,
  label text not null check (char_length(label) between 1 and 160),
  amount numeric(12, 2) not null check (amount >= 0),
  -- false = listed for transparency but excluded from the payable total (e.g. optional accessories).
  is_included boolean not null default true,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotation_line_items_quote_idx on public.quotation_line_items (quotation_id, sort_order);

-- -----------------------------------------------------------------------------
-- Enquiries, bookings, sales
-- -----------------------------------------------------------------------------
create table public.dealer_enquiries (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id),
  quotation_id uuid not null references public.dealer_quotations (id),
  dealer_id uuid not null references public.dealers (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.enquiry_status not null default 'new',
  -- Contact details the customer explicitly consented to share with this dealer.
  customer_name text not null,
  customer_phone text,
  customer_email extensions.citext,
  customer_message text check (char_length(customer_message) <= 1000),
  consent_given_at timestamptz not null default now(),
  dealer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quotation_id, user_id)
);
create index dealer_enquiries_dealer_idx on public.dealer_enquiries (dealer_id, status);
create index dealer_enquiries_user_idx on public.dealer_enquiries (user_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null unique references public.dealer_enquiries (id),
  dealer_id uuid not null references public.dealers (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  batch_id uuid not null references public.batches (id),
  booking_reference text,
  booking_date date not null,
  expected_delivery_date date,
  status public.booking_status not null default 'booked',
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_dealer_idx on public.bookings (dealer_id, status);

create table public.sale_verifications (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null unique references public.dealer_enquiries (id),
  booking_id uuid references public.bookings (id),
  dealer_id uuid not null references public.dealers (id),
  user_id uuid not null references auth.users (id),
  batch_id uuid not null references public.batches (id),
  variant_id uuid not null references public.vehicle_variants (id),
  claimed_by uuid not null references auth.users (id),
  claimed_by_role public.app_role not null,
  sale_reference text,
  invoice_number text,
  sale_date date not null,
  evidence_paths text[] not null default '{}',
  customer_confirmed_at timestamptz,
  status public.sale_status not null default 'claimed',
  evidence_request_note text,
  admin_notes text,
  verified_by uuid references auth.users (id),
  verified_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sale_verifications_status_idx on public.sale_verifications (status);
create index sale_verifications_dealer_idx on public.sale_verifications (dealer_id);

-- -----------------------------------------------------------------------------
-- Commission engine
-- -----------------------------------------------------------------------------
create table public.commission_agreements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dealer_id uuid references public.dealers (id),
  manufacturer_id uuid references public.manufacturers (id),
  vehicle_id uuid references public.vehicles (id),
  variant_id uuid references public.vehicle_variants (id),
  batch_id uuid references public.batches (id),
  calc_type public.commission_calc_type not null,
  fixed_amount numeric(12, 2) check (fixed_amount is null or fixed_amount >= 0),
  percentage numeric(6, 3) check (percentage is null or (percentage > 0 and percentage <= 100)),
  -- Explicit definition of what a percentage applies to, e.g. "Ex-showroom price on dealer invoice".
  basis_label text,
  basis_description text,
  cap_amount numeric(12, 2) check (cap_amount is null or cap_amount > 0),
  effective_from date not null,
  effective_to date,
  status public.agreement_status not null default 'draft',
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  check (
    (calc_type = 'fixed' and fixed_amount is not null and percentage is null)
    or (calc_type = 'percentage' and percentage is not null and fixed_amount is null
        and basis_label is not null and char_length(basis_label) > 0)
  )
);
create index commission_agreements_dealer_idx on public.commission_agreements (dealer_id, status);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  sale_verification_id uuid not null unique references public.sale_verifications (id),
  dealer_id uuid not null references public.dealers (id),
  batch_id uuid not null references public.batches (id),
  variant_id uuid not null references public.vehicle_variants (id),
  agreement_id uuid not null references public.commission_agreements (id),
  sale_reference text,
  verified_completion_date date not null,
  calc_type public.commission_calc_type not null,
  basis_label text,
  basis_amount numeric(12, 2) check (basis_amount is null or basis_amount >= 0),
  rate_percentage numeric(6, 3),
  fixed_amount numeric(12, 2),
  calculated_amount numeric(12, 2) not null check (calculated_amount >= 0),
  adjustment_amount numeric(12, 2) not null default 0,
  adjustment_reason text,
  final_amount numeric(12, 2) generated always as (calculated_amount + adjustment_amount) stored,
  invoice_reference text,
  status public.commission_status not null default 'pending',
  payment_date date,
  payment_reference text,
  dispute_status public.dispute_status not null default 'none',
  dispute_notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (adjustment_amount = 0 or (adjustment_reason is not null and char_length(adjustment_reason) >= 5)),
  check (calculated_amount + adjustment_amount >= 0),
  check (status <> 'paid' or payment_date is not null)
);
create index commissions_status_idx on public.commissions (status);
create index commissions_dealer_idx on public.commissions (dealer_id);

-- -----------------------------------------------------------------------------
-- Notifications, content, audit, abuse protection
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  recipient_email extensions.citext,
  channel public.notification_channel not null default 'email',
  type text not null,
  subject text not null,
  body text not null,
  link_path text,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'pending',
  -- Prevents duplicate notifications when jobs are retried.
  dedupe_key text unique,
  attempts integer not null default 0,
  provider text,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_pending_idx on public.notifications (status, created_at) where status = 'pending';

create table public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text,
  body text not null,
  requires_legal_review boolean not null default true,
  is_published boolean not null default true,
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'general',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email extensions.citext not null,
  phone text,
  subject text not null check (char_length(subject) between 3 and 160),
  message text not null check (char_length(message) between 10 and 4000),
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'cities', 'app_settings', 'profiles', 'manufacturers', 'vehicles', 'vehicle_variants', 'dealer_admin_notes',
    'vehicle_images', 'vehicle_prices', 'dealers', 'dealer_users', 'batches', 'batch_memberships',
    'purchase_intent_confirmations', 'quotation_requests', 'dealer_quotations', 'quotation_line_items',
    'dealer_enquiries', 'bookings', 'sale_verifications', 'commission_agreements', 'commissions',
    'notifications', 'content_pages', 'faqs', 'contact_messages'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;
