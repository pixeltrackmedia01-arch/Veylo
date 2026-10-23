-- =============================================================================
-- GroupDrive — Row Level Security & privileges
-- Least privilege: start from nothing, then grant exactly what each role needs.
-- Column-level grants restrict which fields clients may write; RLS restricts rows;
-- guard triggers enforce state transitions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Reset privileges
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Helper function execution
-- -----------------------------------------------------------------------------
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.current_dealer_ids() to authenticated;
grant execute on function public.is_dealer_member(uuid) to authenticated;
grant execute on function public.can_view_quotation(uuid) to authenticated;
grant execute on function public.can_edit_quotation(uuid) to authenticated;
grant execute on function public.is_trusted_context() to anon, authenticated;
grant execute on function public.batch_transition_allowed(public.batch_status, public.batch_status) to anon, authenticated;
grant execute on function public.commission_transition_allowed(public.commission_status, public.commission_status) to authenticated;

-- Customer actions
grant execute on function public.join_batch(uuid) to authenticated;
grant execute on function public.leave_batch(uuid) to authenticated;
grant execute on function public.respond_purchase_intent(uuid, boolean, text) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.create_enquiry(uuid, text, boolean) to authenticated;

-- Shared customer / dealer / admin actions (each checks authorisation internally)
grant execute on function public.update_enquiry_status(uuid, public.enquiry_status, text) to authenticated;
grant execute on function public.submit_sale_claim(uuid, date, text, text, text[]) to authenticated;

-- Dealer actions
grant execute on function public.start_quotation(uuid) to authenticated;
grant execute on function public.dealer_decline_request(uuid, text) to authenticated;
grant execute on function public.submit_quotation(uuid) to authenticated;
grant execute on function public.dealer_withdraw_quotation(uuid, text) to authenticated;
grant execute on function public.record_booking(uuid, date, text, date) to authenticated;
grant execute on function public.update_booking_status(uuid, public.booking_status, text) to authenticated;

-- Admin actions (each re-checks is_admin())
grant execute on function public.app_log_audit(text, text, text, jsonb, jsonb, text) to authenticated;
grant execute on function public.admin_transition_batch(uuid, public.batch_status, text) to authenticated;
grant execute on function public.admin_extend_batch_deadline(uuid, timestamptz, text) to authenticated;
grant execute on function public.admin_request_quotations(uuid, uuid[]) to authenticated;
grant execute on function public.admin_set_membership_eligibility(uuid, public.membership_eligibility, text) to authenticated;
grant execute on function public.admin_request_purchase_intent(uuid, timestamptz) to authenticated;
grant execute on function public.admin_review_quotation(uuid, text, text) to authenticated;
grant execute on function public.admin_review_sale(uuid, text, text, numeric) to authenticated;
grant execute on function public.admin_create_commission(uuid, numeric) to authenticated;
grant execute on function public.admin_update_commission(uuid, public.commission_status, text, date, text, text) to authenticated;
grant execute on function public.admin_adjust_commission(uuid, numeric, text) to authenticated;
grant execute on function public.admin_set_user_suspension(uuid, boolean, text) to authenticated;
grant execute on function public.admin_set_role(uuid, public.app_role, boolean) to authenticated;
grant execute on function public.admin_mark_phone_verified(uuid, text) to authenticated;
grant execute on function public.admin_link_dealer_user(uuid, text, text) to authenticated;
grant execute on function public.admin_unlink_dealer_user(uuid) to authenticated;
grant execute on function public.admin_set_dealer_authorization(uuid, public.dealer_auth_status, text) to authenticated;
grant execute on function public.admin_dashboard_metrics(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_chart_series(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_batch_funnel(uuid) to authenticated;
grant execute on function public.find_commission_agreement(uuid, uuid, uuid, date) to authenticated;
grant execute on function public.calculate_commission_amount(public.commission_calc_type, numeric, numeric, numeric, numeric) to authenticated;

-- process_due_batches, consume_rate_limit, grant_admin_by_email, enqueue_notification,
-- close_batch, create_quotation_requests and recount_batch stay service-role / owner only.

-- -----------------------------------------------------------------------------
-- Public catalogue (anonymous visitors may browse without logging in)
-- -----------------------------------------------------------------------------
grant select on public.cities, public.manufacturers, public.vehicles, public.vehicle_variants,
  public.vehicle_images, public.vehicle_prices, public.batches, public.content_pages, public.faqs
  to anon, authenticated;
grant select (key, value, description, is_public) on public.app_settings to anon, authenticated;

create policy cities_public_read on public.cities for select to anon, authenticated using (true);
create policy cities_admin_write on public.cities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert, update on public.cities to authenticated;

create policy settings_public_read on public.app_settings for select to anon, authenticated
  using (is_public or public.is_admin());
create policy settings_admin_write on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert, update (value, description, is_public, updated_by) on public.app_settings to authenticated;
grant insert (key) on public.app_settings to authenticated;

create policy manufacturers_public_read on public.manufacturers for select to anon, authenticated
  using (is_active or public.is_admin());
create policy manufacturers_admin_write on public.manufacturers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.manufacturers to authenticated;

create policy vehicles_public_read on public.vehicles for select to anon, authenticated
  using (status = 'published' or public.is_admin());
create policy vehicles_admin_write on public.vehicles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.vehicles to authenticated;

create policy variants_public_read on public.vehicle_variants for select to anon, authenticated
  using (
    public.is_admin()
    or (status = 'published' and exists (
      select 1 from public.vehicles v where v.id = vehicle_id and v.status = 'published'))
  );
create policy variants_admin_write on public.vehicle_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.vehicle_variants to authenticated;

create policy images_public_read on public.vehicle_images for select to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.status = 'published')
  );
create policy images_admin_write on public.vehicle_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.vehicle_images to authenticated;

create policy prices_public_read on public.vehicle_prices for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.vehicle_variants vv join public.vehicles v on v.id = vv.vehicle_id
      where vv.id = variant_id and vv.status = 'published' and v.status = 'published')
  );
create policy prices_admin_write on public.vehicle_prices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert, delete on public.vehicle_prices to authenticated;
grant update (ex_showroom, registration_road_tax, insurance, accessories, extended_warranty, other_charges,
  price_kind, source, source_url, verified_at, valid_until, is_current, is_demo, notes) on public.vehicle_prices to authenticated;

create policy content_public_read on public.content_pages for select to anon, authenticated
  using (is_published or public.is_admin());
create policy content_admin_write on public.content_pages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.content_pages to authenticated;

create policy faqs_public_read on public.faqs for select to anon, authenticated
  using (is_published or public.is_admin());
create policy faqs_admin_write on public.faqs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.faqs to authenticated;

-- Batches: public once opened. Participant identities are never exposed; only the
-- trusted verified_participant_count column is public.
create policy batches_public_read on public.batches for select to anon, authenticated
  using (status <> 'draft' or public.is_admin());
create policy batches_admin_insert on public.batches for insert to authenticated
  with check (public.is_admin());
create policy batches_admin_update on public.batches for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant insert (slug, variant_id, city_id, title, delivery_area, eligibility_rules, target_participants,
  minimum_participants, deadline, is_demo) on public.batches to authenticated;
grant update (slug, title, delivery_area, eligibility_rules, target_participants, minimum_participants,
  variant_id, city_id, is_demo) on public.batches to authenticated;

grant select on public.batch_deadline_extensions to authenticated;
create policy extensions_admin_read on public.batch_deadline_extensions for select to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Profiles & roles
-- -----------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name, phone, city_id, preferred_category, purchase_timeline,
  notify_email, notify_batch_updates, notify_marketing) on public.profiles to authenticated;

create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

grant select on public.user_roles to authenticated;
create policy roles_self_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- Memberships & intent (own rows only)
-- -----------------------------------------------------------------------------
grant select on public.batch_memberships to authenticated;
create policy memberships_self_read on public.batch_memberships for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select on public.purchase_intent_confirmations to authenticated;
create policy intent_self_read on public.purchase_intent_confirmations for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- Dealers
-- -----------------------------------------------------------------------------
grant select on public.dealers to authenticated;
grant insert (name, slug, branch_address, city_id, contact_person, business_email, business_phone, is_active, is_demo)
  on public.dealers to authenticated;
grant update (name, slug, branch_address, city_id, contact_person, business_email, business_phone, is_active, is_demo)
  on public.dealers to authenticated;

create policy dealers_read on public.dealers for select to authenticated
  using (
    public.is_admin()
    or public.is_dealer_member(id)
    -- Quoted customers can see the dealership behind a published quotation.
    or exists (
      select 1 from public.dealer_quotations q
      join public.batch_memberships m on m.batch_id = q.batch_id
      where q.dealer_id = dealers.id and q.published_at is not null
        and m.user_id = auth.uid() and m.status = 'active' and m.eligibility = 'verified')
  );
create policy dealers_admin_insert on public.dealers for insert to authenticated with check (public.is_admin());
create policy dealers_admin_update on public.dealers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.dealer_admin_notes to authenticated;
create policy dealer_notes_admin on public.dealer_admin_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, delete on public.dealer_brands to authenticated;
create policy dealer_brands_read on public.dealer_brands for select to authenticated
  using (public.is_admin() or public.is_dealer_member(dealer_id));
create policy dealer_brands_admin_write on public.dealer_brands for insert to authenticated with check (public.is_admin());
create policy dealer_brands_admin_delete on public.dealer_brands for delete to authenticated using (public.is_admin());

grant select on public.dealer_users to authenticated;
create policy dealer_users_read on public.dealer_users for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Quotations
-- -----------------------------------------------------------------------------
grant select on public.quotation_requests to authenticated;
grant update (notes, response_due_at) on public.quotation_requests to authenticated;
create policy qr_read on public.quotation_requests for select to authenticated
  using (public.is_admin() or public.is_dealer_member(dealer_id));
create policy qr_admin_update on public.quotation_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.dealer_quotations to authenticated;
grant update (quote_reference, valid_until, conditions, availability_note, delivery_timeline, document_path)
  on public.dealer_quotations to authenticated;
create policy quotes_read on public.dealer_quotations for select to authenticated
  using (public.can_view_quotation(id));
create policy quotes_update on public.dealer_quotations for update to authenticated
  using (public.is_admin() or public.is_dealer_member(dealer_id))
  with check (public.is_admin() or public.is_dealer_member(dealer_id));

grant select, insert, update, delete on public.quotation_line_items to authenticated;
create policy line_items_read on public.quotation_line_items for select to authenticated
  using (public.can_view_quotation(quotation_id));
create policy line_items_insert on public.quotation_line_items for insert to authenticated
  with check (public.can_edit_quotation(quotation_id));
create policy line_items_update on public.quotation_line_items for update to authenticated
  using (public.can_edit_quotation(quotation_id)) with check (public.can_edit_quotation(quotation_id));
create policy line_items_delete on public.quotation_line_items for delete to authenticated
  using (public.can_edit_quotation(quotation_id));

-- -----------------------------------------------------------------------------
-- Enquiries, bookings, sales, commissions (party-scoped reads; writes via functions)
-- -----------------------------------------------------------------------------
grant select on public.dealer_enquiries to authenticated;
create policy enquiries_read on public.dealer_enquiries for select to authenticated
  using (user_id = auth.uid() or public.is_dealer_member(dealer_id) or public.is_admin());

grant select on public.bookings to authenticated;
create policy bookings_read on public.bookings for select to authenticated
  using (user_id = auth.uid() or public.is_dealer_member(dealer_id) or public.is_admin());

grant select on public.sale_verifications to authenticated;
create policy sales_read on public.sale_verifications for select to authenticated
  using (user_id = auth.uid() or public.is_dealer_member(dealer_id) or public.is_admin());

grant select, insert on public.commission_agreements to authenticated;
grant update (name, status, effective_to, notes, cap_amount) on public.commission_agreements to authenticated;
create policy agreements_admin on public.commission_agreements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy agreements_dealer_read on public.commission_agreements for select to authenticated
  using (dealer_id is not null and public.is_dealer_member(dealer_id) and status = 'active');

grant select on public.commissions to authenticated;
create policy commissions_read on public.commissions for select to authenticated
  using (public.is_admin() or public.is_dealer_member(dealer_id));

-- -----------------------------------------------------------------------------
-- Notifications, contact, audit
-- -----------------------------------------------------------------------------
grant select on public.notifications to authenticated;
create policy notifications_read on public.notifications for select to authenticated
  using ((user_id = auth.uid() and channel = 'in_app') or public.is_admin());

grant select on public.contact_messages to authenticated;
grant update (status) on public.contact_messages to authenticated;
create policy contact_admin_read on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_admin_update on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.audit_logs to authenticated;
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());
-- No insert/update/delete grants: audit rows are written only by log_audit().
