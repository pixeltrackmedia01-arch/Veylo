-- =============================================================================
-- QA hardening from the Supabase security/performance advisors:
-- * pin search_path on the remaining SECURITY INVOKER helpers and triggers;
-- * evaluate auth.uid() once per statement in RLS policies (initplan);
-- * storage folder checks are for signed-in users only;
-- * index foreign keys used by joins, filters and cascading deletes.
-- Behaviour is unchanged.
-- =============================================================================

alter function public.is_trusted_context() set search_path = public, extensions, pg_temp;
alter function public.guard_profile_update() set search_path = public, extensions, pg_temp;
alter function public.set_updated_at() set search_path = public, extensions, pg_temp;
alter function public.guard_batch_update() set search_path = public, extensions, pg_temp;
alter function public.guard_batch_insert() set search_path = public, extensions, pg_temp;
alter function public.guard_line_item_write() set search_path = public, extensions, pg_temp;
alter function public.guard_quotation_update() set search_path = public, extensions, pg_temp;
alter function public.batch_transition_allowed(public.batch_status, public.batch_status) set search_path = public, extensions, pg_temp;
alter function public.commission_transition_allowed(public.commission_status, public.commission_status) set search_path = public, extensions, pg_temp;
alter function public.calculate_commission_amount(public.commission_calc_type, numeric, numeric, numeric, numeric) set search_path = public, extensions, pg_temp;
alter function public.try_uuid(text) set search_path = public, extensions, pg_temp;

-- Storage folder checks are only referenced by authenticated-only storage policies.
revoke execute on function public.can_access_quote_folder(uuid, uuid) from public, anon;
revoke execute on function public.can_access_sale_folder(uuid) from public, anon;

-- RLS: (select auth.uid()) is evaluated once per statement instead of per row.
alter policy memberships_self_read on public.batch_memberships
  using (user_id = (select auth.uid()) or public.is_admin());
alter policy bookings_read on public.bookings
  using (user_id = (select auth.uid()) or public.is_dealer_member(dealer_id) or public.is_admin());
alter policy enquiries_read on public.dealer_enquiries
  using (user_id = (select auth.uid()) or public.is_dealer_member(dealer_id) or public.is_admin());
alter policy dealer_users_read on public.dealer_users
  using (public.is_admin() or user_id = (select auth.uid()));
alter policy dealers_read on public.dealers
  using (
    public.is_admin()
    or public.is_dealer_member(id)
    or exists (
      select 1
        from public.dealer_quotations q
        join public.batch_memberships m on m.batch_id = q.batch_id
       where q.dealer_id = dealers.id
         and q.published_at is not null
         and m.user_id = (select auth.uid())
         and m.status = 'active'
         and m.eligibility = 'verified'));
alter policy notifications_read on public.notifications
  using ((user_id = (select auth.uid()) and channel = 'in_app') or public.is_admin());
alter policy profiles_self_read on public.profiles
  using (id = (select auth.uid()) or public.is_admin());
alter policy profiles_self_update on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy intent_self_read on public.purchase_intent_confirmations
  using (user_id = (select auth.uid()) or public.is_admin());
alter policy sales_read on public.sale_verifications
  using (user_id = (select auth.uid()) or public.is_dealer_member(dealer_id) or public.is_admin());
alter policy saved_vehicles_own on public.saved_vehicles
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy roles_self_read on public.user_roles
  using (user_id = (select auth.uid()) or public.is_admin());

-- Foreign-key indexes.
create index if not exists batch_deadline_extensions_batch_idx on public.batch_deadline_extensions (batch_id);
create index if not exists bookings_batch_idx on public.bookings (batch_id);
create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists commission_agreements_batch_idx on public.commission_agreements (batch_id);
create index if not exists commission_agreements_manufacturer_idx on public.commission_agreements (manufacturer_id);
create index if not exists commission_agreements_vehicle_idx on public.commission_agreements (vehicle_id);
create index if not exists commission_agreements_variant_idx on public.commission_agreements (variant_id);
create index if not exists commissions_agreement_idx on public.commissions (agreement_id);
create index if not exists commissions_batch_idx on public.commissions (batch_id);
create index if not exists commissions_variant_idx on public.commissions (variant_id);
create index if not exists contact_messages_user_idx on public.contact_messages (user_id);
create index if not exists dealer_enquiries_batch_idx on public.dealer_enquiries (batch_id);
create index if not exists dealer_quotations_variant_idx on public.dealer_quotations (variant_id);
create index if not exists leads_user_idx on public.leads (user_id);
create index if not exists leads_variant_idx on public.leads (variant_id);
create index if not exists sale_verifications_batch_idx on public.sale_verifications (batch_id);
create index if not exists sale_verifications_booking_idx on public.sale_verifications (booking_id);
create index if not exists sale_verifications_user_idx on public.sale_verifications (user_id);
create index if not exists sale_verifications_variant_idx on public.sale_verifications (variant_id);
create index if not exists saved_vehicles_vehicle_idx on public.saved_vehicles (vehicle_id);
create index if not exists vehicle_images_variant_idx on public.vehicle_images (variant_id);
create index if not exists vehicle_prices_city_idx on public.vehicle_prices (city_id);
