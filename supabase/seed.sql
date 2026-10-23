-- =============================================================================
-- GroupDrive — DEVELOPMENT SEED DATA
--
-- EVERYTHING IN THIS FILE IS DEMO DATA. Vehicles, prices, dealers, quotations,
-- participants and sales below are illustrative only, flagged with is_demo and
-- labelled "Demo" in the UI. Never run this file against production.
--
-- Demo participant accounts have no password and cannot sign in.
-- No administrator is created here: see README "Create the first administrator".
-- =============================================================================

do $$
declare
  v_surat uuid := (select id from public.cities where slug = 'surat');
  -- manufacturers
  m_maruti uuid := gen_random_uuid();
  m_hyundai uuid := gen_random_uuid();
  m_tata uuid := gen_random_uuid();
  m_honda uuid := gen_random_uuid();
  m_tvs uuid := gen_random_uuid();
  m_bajaj uuid := gen_random_uuid();
  -- vehicles
  v_swift uuid := gen_random_uuid();
  v_creta uuid := gen_random_uuid();
  v_nexon uuid := gen_random_uuid();
  v_activa uuid := gen_random_uuid();
  v_jupiter uuid := gen_random_uuid();
  v_pulsar uuid := gen_random_uuid();
  -- variants
  vv_swift_vxi uuid := gen_random_uuid();
  vv_swift_zxi uuid := gen_random_uuid();
  vv_creta_sx uuid := gen_random_uuid();
  vv_creta_ex uuid := gen_random_uuid();
  vv_nexon_cs uuid := gen_random_uuid();
  vv_activa_std uuid := gen_random_uuid();
  vv_activa_dlx uuid := gen_random_uuid();
  vv_jupiter_zx uuid := gen_random_uuid();
  vv_pulsar_n160 uuid := gen_random_uuid();
  -- dealers
  d_one uuid := gen_random_uuid();
  d_two uuid := gen_random_uuid();
  d_three uuid := gen_random_uuid();
  d_four uuid := gen_random_uuid();
  -- batches
  b_swift_open uuid := gen_random_uuid();
  b_creta uuid := gen_random_uuid();
  b_nexon uuid := gen_random_uuid();
  b_activa uuid := gen_random_uuid();
  b_jupiter uuid := gen_random_uuid();
  b_swift_closed uuid := gen_random_uuid();
  b_pulsar_draft uuid := gen_random_uuid();
  b_expired uuid := gen_random_uuid();
  users uuid[] := '{}';
  u uuid;
  i integer;
  q_one uuid;
  q_two uuid;
  enq uuid;
  bk uuid;
  sale uuid;
  agreement uuid;
begin
  if v_surat is null then
    raise exception 'Run migrations before seeding (Surat city missing).';
  end if;

  -- ---------------------------------------------------------------------------
  -- Demo participants (no password; cannot log in)
  -- ---------------------------------------------------------------------------
  for i in 1..25 loop
    u := gen_random_uuid();
    users := users || u;
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change,
      created_at, updated_at)
    values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      format('demo-participant-%s@example.invalid', lpad(i::text, 2, '0')), '', now(),
      jsonb_build_object(
        'full_name', format('Demo Participant %s', lpad(i::text, 2, '0')),
        -- Participants 23-25 have no phone and therefore stay unverified.
        'phone', case when i <= 22 then format('+9190000%s', lpad(i::text, 5, '0')) else null end,
        'city', 'surat',
        'preferred_category', case when i % 2 = 0 then 'car' else 'two_wheeler' end,
        'purchase_timeline', 'within_3_months'),
      '{"provider": "email", "providers": ["email"]}'::jsonb, '', '', '', '',
      now() - (i || ' days')::interval, now());
  end loop;

  -- Demo accounts never receive email.
  update public.profiles set notify_email = false where email like '%@example.invalid';

  -- ---------------------------------------------------------------------------
  -- Catalogue
  -- ---------------------------------------------------------------------------
  insert into public.manufacturers (id, name, slug, categories) values
    (m_maruti, 'Maruti Suzuki', 'maruti-suzuki', '{car}'),
    (m_hyundai, 'Hyundai', 'hyundai', '{car}'),
    (m_tata, 'Tata Motors', 'tata-motors', '{car}'),
    (m_honda, 'Honda Motorcycle & Scooter India', 'honda-2w', '{two_wheeler}'),
    (m_tvs, 'TVS Motor', 'tvs', '{two_wheeler}'),
    (m_bajaj, 'Bajaj Auto', 'bajaj', '{two_wheeler}');

  insert into public.vehicles (id, manufacturer_id, model_name, slug, category, body_type, description, highlights, status, is_demo, published_at) values
    (v_swift, m_maruti, 'Swift', 'maruti-suzuki-swift', 'car', 'hatchback',
     'Demo listing for a popular compact hatchback. Specifications and prices shown are demo data.',
     '{"Compact hatchback","Petrol & AMT options","Demo data"}', 'published', true, now()),
    (v_creta, m_hyundai, 'Creta', 'hyundai-creta', 'car', 'suv',
     'Demo listing for a mid-size SUV. Specifications and prices shown are demo data.',
     '{"Mid-size SUV","Petrol & diesel options","Demo data"}', 'published', true, now()),
    (v_nexon, m_tata, 'Nexon', 'tata-nexon', 'car', 'compact_suv',
     'Demo listing for a compact SUV. Specifications and prices shown are demo data.',
     '{"Compact SUV","Demo data"}', 'published', true, now()),
    (v_activa, m_honda, 'Activa', 'honda-activa', 'two_wheeler', 'scooter',
     'Demo listing for a family scooter. Specifications and prices shown are demo data.',
     '{"110cc-class scooter","Demo data"}', 'published', true, now()),
    (v_jupiter, m_tvs, 'Jupiter', 'tvs-jupiter', 'two_wheeler', 'scooter',
     'Demo listing for a commuter scooter. Specifications and prices shown are demo data.',
     '{"Commuter scooter","Demo data"}', 'published', true, now()),
    (v_pulsar, m_bajaj, 'Pulsar N160', 'bajaj-pulsar-n160', 'two_wheeler', 'motorcycle',
     'Demo listing for a 160cc-class motorcycle. Specifications and prices shown are demo data.',
     '{"Street motorcycle","Demo data"}', 'published', true, now());

  insert into public.vehicle_variants (id, vehicle_id, name, slug, fuel_type, transmission, engine_cc, specifications, specs_source, specs_verified_at, status, sort_order) values
    (vv_swift_vxi, v_swift, 'VXi', 'vxi', 'petrol', 'manual', 1197, '{"Seating": "5", "Body": "Hatchback"}', 'Demo data — verify against the manufacturer brochure', current_date, 'published', 1),
    (vv_swift_zxi, v_swift, 'ZXi AMT', 'zxi-amt', 'petrol', 'amt', 1197, '{"Seating": "5", "Body": "Hatchback"}', 'Demo data — verify against the manufacturer brochure', current_date, 'published', 2),
    (vv_creta_ex, v_creta, 'EX', 'ex', 'petrol', 'manual', 1497, '{"Seating": "5", "Body": "SUV"}', 'Demo data — verify against the manufacturer brochure', current_date, 'published', 1),
    (vv_creta_sx, v_creta, 'SX Diesel AT', 'sx-diesel-at', 'diesel', 'automatic', 1493, '{"Seating": "5", "Body": "SUV"}', 'Demo data — verify against the manufacturer brochure', current_date, 'published', 2),
    (vv_nexon_cs, v_nexon, 'Creative S', 'creative-s', 'petrol', 'manual', 1199, '{"Seating": "5", "Body": "Compact SUV"}', 'Demo data — verify against the manufacturer brochure', current_date, 'published', 1),
    (vv_activa_std, v_activa, 'Standard', 'standard', 'petrol', 'cvt', 109, '{"Type": "Scooter"}', 'Demo data — verify against the manufacturer brochure', current_date, 'published', 1),
    (vv_activa_dlx, v_activa, 'DLX', 'dlx', 'petrol', 'cvt', 109, '{"Type": "Scooter"}', 'Demo data — verify against the manufacturer brochure', current_date, 'published', 2),
    (vv_jupiter_zx, v_jupiter, 'ZX', 'zx', 'petrol', 'cvt', 113, '{"Type": "Scooter"}', 'Demo data — verify against the manufacturer brochure', current_date, 'published', 1),
    (vv_pulsar_n160, v_pulsar, 'Dual Channel ABS', 'dual-channel-abs', 'petrol', 'manual', 164, '{"Type": "Motorcycle"}', 'Demo data — verify against the manufacturer brochure', current_date, 'published', 1);

  insert into public.vehicle_images (vehicle_id, external_url, alt_text, attribution, is_placeholder, sort_order) values
    (v_swift, '/images/placeholders/hatchback.svg', 'Illustration of a hatchback (placeholder)', 'GroupDrive placeholder illustration', true, 0),
    (v_creta, '/images/placeholders/suv.svg', 'Illustration of an SUV (placeholder)', 'GroupDrive placeholder illustration', true, 0),
    (v_nexon, '/images/placeholders/suv.svg', 'Illustration of a compact SUV (placeholder)', 'GroupDrive placeholder illustration', true, 0),
    (v_activa, '/images/placeholders/scooter.svg', 'Illustration of a scooter (placeholder)', 'GroupDrive placeholder illustration', true, 0),
    (v_jupiter, '/images/placeholders/scooter.svg', 'Illustration of a scooter (placeholder)', 'GroupDrive placeholder illustration', true, 0),
    (v_pulsar, '/images/placeholders/motorcycle.svg', 'Illustration of a motorcycle (placeholder)', 'GroupDrive placeholder illustration', true, 0);

  -- Demo reference prices: round illustrative numbers, explicitly not real.
  insert into public.vehicle_prices (variant_id, city_id, ex_showroom, registration_road_tax, insurance, accessories, other_charges, price_kind, source, verified_at, valid_until, is_demo) values
    (vv_swift_vxi, v_surat, 700000, 45000, 35000, 0, 5000, 'indicative', 'DEMO DATA — illustrative figure, not a real price', current_date, current_date + 60, true),
    (vv_swift_zxi, v_surat, 850000, 55000, 40000, 0, 5000, 'indicative', 'DEMO DATA — illustrative figure, not a real price', current_date, current_date + 60, true),
    (vv_creta_sx, v_surat, 1900000, 120000, 75000, 0, 10000, 'indicative', 'DEMO DATA — illustrative figure, not a real price', current_date, current_date + 60, true),
    (vv_nexon_cs, v_surat, 1000000, 65000, 45000, 0, 5000, 'indicative', 'DEMO DATA — illustrative figure, not a real price', current_date, current_date + 60, true),
    (vv_activa_std, v_surat, 80000, 6000, 5000, 0, 1000, 'indicative', 'DEMO DATA — illustrative figure, not a real price', current_date, current_date + 60, true),
    (vv_jupiter_zx, v_surat, 85000, 6500, 5000, 0, 1000, 'indicative', 'DEMO DATA — illustrative figure, not a real price', current_date, current_date + 60, true);

  -- ---------------------------------------------------------------------------
  -- Demo dealers (fictional; clearly labelled)
  -- ---------------------------------------------------------------------------
  insert into public.dealers (id, name, slug, branch_address, city_id, contact_person, business_email, business_phone,
    authorization_status, authorization_verified_at, is_active, is_demo) values
    (d_one, 'Demo Motors Surat (DEMO)', 'demo-motors-surat', 'Demo address — Ring Road, Surat', v_surat, 'Demo Contact A', 'dealer-a@example.invalid', '+919000099001', 'verified', now(), true, true),
    (d_two, 'Sample Auto Hub (DEMO)', 'sample-auto-hub', 'Demo address — Adajan, Surat', v_surat, 'Demo Contact B', 'dealer-b@example.invalid', '+919000099002', 'verified', now(), true, true),
    (d_three, 'Placeholder Two Wheels (DEMO)', 'placeholder-two-wheels', 'Demo address — Vesu, Surat', v_surat, 'Demo Contact C', 'dealer-c@example.invalid', '+919000099003', 'verified', now(), true, true),
    (d_four, 'Unverified Example Dealer (DEMO)', 'unverified-example-dealer', 'Demo address — Varachha, Surat', v_surat, 'Demo Contact D', 'dealer-d@example.invalid', '+919000099004', 'pending', null, true, true);

  insert into public.dealer_brands (dealer_id, manufacturer_id) values
    (d_one, m_maruti), (d_one, m_tata), (d_two, m_maruti), (d_two, m_hyundai),
    (d_three, m_honda), (d_three, m_tvs), (d_three, m_bajaj), (d_four, m_maruti);
  insert into public.dealer_admin_notes (dealer_id, notes) values
    (d_four, 'Demo: authorisation documents not yet received.');

  insert into public.commission_agreements (dealer_id, name, calc_type, fixed_amount, effective_from, status, notes) values
    (d_one, 'DEMO — fixed fee per verified car sale', 'fixed', 5000, current_date - 90, 'active', 'Demo agreement, not a real commercial term.');
  insert into public.commission_agreements (dealer_id, name, calc_type, percentage, basis_label, basis_description, cap_amount, effective_from, status, notes)
  values (d_two, 'DEMO — percentage of agreed basis', 'percentage', 0.5, 'Ex-showroom price on dealer invoice',
          'Percentage applies to the ex-showroom amount printed on the customer invoice, excluding taxes, registration, insurance and accessories.',
          10000, current_date - 90, 'active', 'Demo agreement, not a real commercial term.')
  returning id into agreement;

  -- ---------------------------------------------------------------------------
  -- Batches
  -- ---------------------------------------------------------------------------
  insert into public.batches (id, slug, variant_id, city_id, title, delivery_area, eligibility_rules, target_participants, minimum_participants, deadline, status, opened_at, is_demo) values
    (b_swift_open, 'surat-swift-vxi-demo-1', vv_swift_vxi, v_surat, 'Maruti Suzuki Swift VXi — Surat group (Demo)', 'Surat city and SUDA limits', 'Residents of Surat planning to buy within 3 months.', 20, 5, now() + interval '21 days', 'open', now() - interval '9 days', true),
    (b_creta, 'surat-creta-sx-demo-1', vv_creta_sx, v_surat, 'Hyundai Creta SX Diesel AT — Surat group (Demo)', 'Surat city and SUDA limits', 'Residents of Surat planning to buy within 3 months.', 20, 5, now() + interval '10 days', 'open', now() - interval '12 days', true),
    (b_nexon, 'surat-nexon-creative-s-demo-1', vv_nexon_cs, v_surat, 'Tata Nexon Creative S — Surat group (Demo)', 'Surat city and SUDA limits', null, 20, 5, now() + interval '30 days', 'open', now() - interval '2 days', true),
    (b_activa, 'surat-activa-standard-demo-1', vv_activa_std, v_surat, 'Honda Activa Standard — Surat group (Demo)', 'Surat city', null, 20, 5, now() + interval '14 days', 'open', now() - interval '6 days', true),
    (b_jupiter, 'surat-jupiter-zx-demo-1', vv_jupiter_zx, v_surat, 'TVS Jupiter ZX — Surat group (Demo)', 'Surat city', null, 20, 5, now() + interval '36 hours', 'open', now() - interval '20 days', true),
    (b_swift_closed, 'surat-swift-zxi-amt-demo-1', vv_swift_zxi, v_surat, 'Maruti Suzuki Swift ZXi AMT — Surat group (Demo)', 'Surat city and SUDA limits', null, 20, 5, now() + interval '7 days', 'open', now() - interval '30 days', true),
    (b_pulsar_draft, 'surat-pulsar-n160-demo-1', vv_pulsar_n160, v_surat, 'Bajaj Pulsar N160 — Surat group (Demo draft)', 'Surat city', null, 20, 5, now() + interval '45 days', 'draft', null, true),
    (b_expired, 'surat-creta-ex-demo-0', vv_creta_ex, v_surat, 'Hyundai Creta EX — Surat group (Demo, expired)', 'Surat city', null, 20, 5, now() + interval '1 day', 'open', now() - interval '40 days', true);

  -- Memberships: inserted through the same guard/count triggers the app uses.
  for i in 1..12 loop
    insert into public.batch_memberships (batch_id, user_id, eligibility) values (b_swift_open, users[i], 'verified');
  end loop;
  insert into public.batch_memberships (batch_id, user_id, eligibility) values
    (b_swift_open, users[23], 'pending_verification'), (b_swift_open, users[24], 'pending_verification');
  for i in 5..11 loop
    insert into public.batch_memberships (batch_id, user_id, eligibility) values (b_creta, users[i], 'verified');
  end loop;
  for i in 13..15 loop
    insert into public.batch_memberships (batch_id, user_id, eligibility) values (b_nexon, users[i], 'verified');
  end loop;
  for i in 1..16 loop
    insert into public.batch_memberships (batch_id, user_id, eligibility) values (b_activa, users[i + 3], 'verified');
  end loop;
  for i in 1..19 loop
    insert into public.batch_memberships (batch_id, user_id, eligibility) values (b_jupiter, users[i], 'verified');
  end loop;
  for i in 1..2 loop
    insert into public.batch_memberships (batch_id, user_id, eligibility) values (b_expired, users[i + 10], 'verified');
  end loop;
  -- 20th verified member closes this batch automatically and creates quotation
  -- requests for verified Maruti dealers (d_one, d_two — not the unverified d_four).
  for i in 1..20 loop
    insert into public.batch_memberships (batch_id, user_id, eligibility) values (b_swift_closed, users[i], 'verified');
  end loop;

  -- Expire the under-subscribed batch by moving its deadline into the past and
  -- running the same job production uses.
  update public.batches set deadline = now() - interval '1 hour' where id = b_expired;
  perform public.process_due_batches();

  -- ---------------------------------------------------------------------------
  -- Demo quotations for the closed Swift batch
  -- ---------------------------------------------------------------------------
  insert into public.dealer_quotations (quotation_request_id, batch_id, dealer_id, variant_id, status, quote_reference,
    valid_until, conditions, availability_note, delivery_timeline, submitted_at, is_demo)
  select q.id, q.batch_id, q.dealer_id, vv_swift_zxi, 'draft', 'DEMO-Q-001', current_date + 21,
    'DEMO DATA. Illustrative quotation for development only. Subject to dealer confirmation.',
    'Demo: stock to be confirmed by dealer', 'Demo: 2–4 weeks from booking', now(), true
  from public.quotation_requests q where q.batch_id = b_swift_closed and q.dealer_id = d_one
  returning id into q_one;

  insert into public.quotation_line_items (quotation_id, category, label, amount, is_included, sort_order) values
    (q_one, 'ex_showroom', 'Ex-showroom price (demo)', 850000, true, 1),
    (q_one, 'registration_road_tax', 'Registration & road tax (demo)', 55000, true, 2),
    (q_one, 'insurance', 'Comprehensive insurance, 1st year (demo)', 38000, true, 3),
    (q_one, 'other_charge', 'FASTag & handling (demo)', 3000, true, 4),
    (q_one, 'accessories', 'Optional accessory pack (demo)', 15000, false, 5),
    (q_one, 'discount', 'Group dealer discount (demo)', 12000, true, 6);

  update public.dealer_quotations set status = 'submitted' where id = q_one;
  update public.dealer_quotations set status = 'approved', approved_at = now(), reviewed_at = now() where id = q_one;
  update public.dealer_quotations set status = 'published', published_at = now() where id = q_one;
  update public.quotation_requests set status = 'responded', responded_at = now()
   where batch_id = b_swift_closed and dealer_id = d_one;

  insert into public.dealer_quotations (quotation_request_id, batch_id, dealer_id, variant_id, status, quote_reference,
    valid_until, conditions, submitted_at, is_demo)
  select q.id, q.batch_id, q.dealer_id, vv_swift_zxi, 'draft', 'DEMO-Q-002', current_date + 14,
    'DEMO DATA. Awaiting admin review.', now(), true
  from public.quotation_requests q where q.batch_id = b_swift_closed and q.dealer_id = d_two
  returning id into q_two;
  insert into public.quotation_line_items (quotation_id, category, label, amount, is_included, sort_order) values
    (q_two, 'ex_showroom', 'Ex-showroom price (demo)', 850000, true, 1),
    (q_two, 'registration_road_tax', 'Registration & road tax (demo)', 55000, true, 2),
    (q_two, 'insurance', 'Insurance, 1st year (demo)', 41000, true, 3),
    (q_two, 'extended_warranty', 'Extended warranty (demo)', 9000, true, 4);
  update public.dealer_quotations set status = 'submitted' where id = q_two;
  update public.quotation_requests set status = 'responded', responded_at = now()
   where batch_id = b_swift_closed and dealer_id = d_two;

  update public.batches set status = 'quotes_published' where id = b_swift_closed;

  -- Purchase intent, enquiry, booking and a sale claim for dashboard demos.
  insert into public.purchase_intent_confirmations (membership_id, batch_id, user_id, status, responded_at)
  select m.id, m.batch_id, m.user_id,
         case when row_number() over () <= 14 then 'confirmed'::public.intent_status else 'requested'::public.intent_status end,
         case when row_number() over () <= 14 then now() else null end
  from public.batch_memberships m where m.batch_id = b_swift_closed;

  for i in 1..3 loop
    insert into public.dealer_enquiries (batch_id, quotation_id, dealer_id, user_id, status, customer_name, customer_phone, customer_email, customer_message)
    select b_swift_closed, q_one, d_one, users[i], (case when i = 1 then 'booked' else 'contacted' end)::public.enquiry_status,
           p.full_name, p.phone, p.email, 'Demo enquiry'
    from public.profiles p where p.id = users[i]
    returning id into enq;
    if i = 1 then
      insert into public.bookings (enquiry_id, dealer_id, user_id, batch_id, booking_reference, booking_date)
      values (enq, d_one, users[i], b_swift_closed, 'DEMO-BK-001', current_date - 3)
      returning id into bk;
      insert into public.sale_verifications (enquiry_id, booking_id, dealer_id, user_id, batch_id, variant_id,
        claimed_by, claimed_by_role, invoice_number, sale_date, status)
      values (enq, bk, d_one, users[i], b_swift_closed, vv_swift_zxi, users[i], 'customer', 'DEMO-INV-001', current_date - 1, 'claimed')
      returning id into sale;
    end if;
  end loop;

  update public.batches set status = 'purchase_in_progress' where id = b_swift_closed;

  raise notice 'Demo seed complete. Closed batch %, published quotation %, sale claim %', b_swift_closed, q_one, sale;
end;
$$;
