-- =============================================================================
-- GroupDrive — production defaults (launch city, settings, FAQs).
-- Demo catalogue, dealers and quotations live in supabase/seed.sql (dev only).
-- =============================================================================

insert into public.cities (name, slug, state, is_active) values
  ('Surat', 'surat', 'Gujarat', true)
on conflict (slug) do nothing;

insert into public.app_settings (key, value, description, is_public) values
  ('verification.require_phone', 'false',
   'When true, a participant counts toward a batch target only after verifying their mobile number via OTP (requires an SMS provider configured in Supabase Auth).', false),
  ('batches.default_target', '20', 'Default number of verified participants a new batch targets.', true),
  ('batches.default_minimum', '5', 'Minimum verified participants at the deadline for quotations to be requested; fewer than this and the batch expires.', false),
  ('contact.public', '{"email": "hello@example.com", "phone": "", "address": "Surat, Gujarat, India", "hours": "Mon–Sat, 10:00–18:00 IST"}',
   'Public contact details shown on the website. Replace before launch.', true),
  ('home.hero', '{"eyebrow": "Now live in Surat", "headline": "Buy your next vehicle together, decide with clearer quotes.", "subheadline": "Join a free buyer group for the exact model and variant you want. When the group closes, we ask authorised dealerships for itemised quotations that we review before you see them."}',
   'Homepage hero copy.', true)
on conflict (key) do nothing;

insert into public.faqs (question, answer, category, sort_order) values
  ('Is it really free to join a group?',
   'Yes. Joining a group is completely free. GroupDrive never charges customers a registration or joining fee. We may earn a commission from a dealership after a verified completed sale, under an agreement with that dealership.',
   'general', 10),
  ('Am I guaranteed a discount?',
   'No. A group reaching its target lets us ask authorised dealerships for competitive, itemised quotations. Dealers decide what they offer. You may receive no improved offer, and you are never obliged to buy.',
   'general', 20),
  ('Who sells me the vehicle?',
   'You buy directly from an authorised dealership. The final on-road price, offers, stock, financing, insurance, registration and delivery are confirmed by the dealership, not by GroupDrive.',
   'general', 30),
  ('What counts as a verified participant?',
   'A participant whose account is in good standing, whose email (and mobile number, when required) is verified, and who lives in the group''s city. Page views, unverified sign-ups and duplicate memberships never count toward the target.',
   'groups', 40),
  ('When does a group close?',
   'A group closes when it reaches its target of verified participants or when its deadline passes, whichever happens first. If too few people joined by the deadline, the group expires and no quotations are requested.',
   'groups', 50),
  ('Will dealers see my phone number?',
   'Not unless you choose to contact a dealership about a published quotation. Other participants never see your details. Dealers only receive the contact details you agree to share when you send an enquiry.',
   'privacy', 60),
  ('Can I leave a group?',
   'Yes, you can leave a group at any time while it is still open, from your dashboard.',
   'groups', 70),
  ('How are quotations checked?',
   'Dealer quotations must be itemised (ex-showroom price, registration and road tax, insurance, accessories and other charges). Our team reviews each quotation before it is published to verified participants. Draft or unreviewed quotations are never shown as offers.',
   'quotations', 80),
  ('How do you calculate savings?',
   'We only show a saving when we have a verified reference price for the same variant and city and a valid published quotation that covers comparable charges. Otherwise we show the itemised quotation without a savings figure.',
   'quotations', 90)
on conflict do nothing;
