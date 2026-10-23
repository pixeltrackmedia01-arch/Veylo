-- =============================================================================
-- Starter FAQ set (categorised, with anchors and home-page featuring) and the
-- new home hero copy. Only replaces the original default rows and copy, so
-- anything an admin has already edited is left alone.
-- =============================================================================

delete from public.faqs
 where vehicle_id is null
   and slug is null
   and question in (
     'Is it really free to join a group?', 'Am I guaranteed a discount?', 'Who sells me the vehicle?',
     'What counts as a verified participant?', 'When does a group close?', 'Will dealers see my phone number?',
     'Can I leave a group?', 'How are quotations checked?', 'How do you calculate savings?');

insert into public.faqs (slug, category, sort_order, featured, question, answer) values
  -- How it works
  ('what-is-groupdrive', 'how_it_works', 10, true, 'What is GroupDrive?',
   'GroupDrive is a free group-buying platform for new cars and two-wheelers. Buyers who want the same model and variant in the same city join a group. When the group closes, we ask authorised dealerships for itemised quotations, review them and share them with the group. You then decide whether to buy, directly from the dealership.'),
  ('how-does-group-buying-work', 'how_it_works', 20, true, 'How does group buying work?',
   '1. **Choose a car** and the exact variant you plan to buy.
2. **Join its group for free** after verifying your account.
3. When the group reaches **20 verified buyers** or its deadline, we request itemised quotations from authorised dealers.
4. We **review every quotation** and publish it to the group.
5. **You decide**: contact the dealership and buy, or walk away.'),
  ('why-buy-as-a-group', 'how_it_works', 30, false, 'Why buy as a group instead of on my own?',
   'A dealership sees 20 verified local buyers interested in the same variant, which is a much stronger signal than a single walk-in enquiry. That makes it worth their while to offer a sharper, itemised quote. You also get quotations that are comparable line by line.'),
  ('which-cities', 'how_it_works', 40, false, 'Which cities do you cover?',
   'We are live in Surat, Gujarat. Groups are city-specific because on-road prices, taxes and dealerships differ by city. More cities will follow.'),
  ('cars-and-two-wheelers', 'how_it_works', 50, false, 'Is it only for cars?',
   'No. We run groups for cars and for two-wheelers (scooters and motorcycles). Browse **New Cars** or the two-wheeler listings to see what is open.'),

  -- Joining a group
  ('is-it-free', 'joining', 10, true, 'Is it really free to join a group?',
   'Yes. Joining a group is completely free. GroupDrive never charges customers a registration or joining fee. We may earn a commission from a dealership after a verified completed sale, under a written agreement with that dealership.'),
  ('verified-participant', 'joining', 20, false, 'What counts as a verified participant?',
   'A participant whose account is in good standing, whose email (and mobile number, when required) is verified, and who lives in the group''s city. Page views, unverified sign-ups and duplicate memberships never count toward the target.'),
  ('how-many-buyers', 'joining', 30, false, 'How many buyers does a group need?',
   'Most groups target **20 verified buyers**. Each group also has a minimum; if fewer people join before the deadline, the group expires and no quotations are requested.'),
  ('when-does-a-group-close', 'joining', 40, true, 'When does a group close?',
   'A group closes when it reaches its target of verified participants or when its deadline passes, whichever happens first. If too few people joined by the deadline, the group expires and no quotations are requested.'),
  ('can-i-leave', 'joining', 50, false, 'Can I leave a group?',
   'Yes, you can leave a group at any time while it is still open, from your dashboard. Leaving is free and has no consequences.'),
  ('more-than-one-group', 'joining', 60, false, 'Can I join more than one group?',
   'Yes. You can join groups for different cars or variants while you decide. You are not committing to buy any of them.'),
  ('no-group-for-my-car', 'joining', 70, false, 'There''s no group for the car I want. What can I do?',
   'Open the car''s page and tap **Check my price**. We''ll note your interest and let you know when a group opens for that car in your city.'),

  -- Pricing & savings
  ('guaranteed-discount', 'pricing', 10, true, 'Am I guaranteed a discount?',
   'No. A full group lets us ask authorised dealerships for competitive, itemised quotations, but dealers decide what they offer. You may receive no improved offer, and you are never obliged to buy.'),
  ('how-much-can-i-save', 'pricing', 20, false, 'How much can I save?',
   'Savings vary by car, dealer, season and how many buyers join. The figure on our home page is an estimate, not a promise. On a group page we only show a saving when we have a verified reference price for the same variant and city.'),
  ('how-are-savings-calculated', 'pricing', 30, false, 'How do you calculate savings?',
   'We only show a saving when we have a verified reference price for the same variant and city and a valid published quotation that covers comparable charges. Otherwise we show the itemised quotation without a savings figure.'),
  ('are-listed-prices-final', 'pricing', 40, false, 'Are the prices on car pages final?',
   'No. Car pages show **indicative** ex-showroom prices and an estimated on-road price for Surat, with the date we last checked them. The dealership confirms the final price, offers and availability.'),
  ('what-is-on-road-price', 'pricing', 50, false, 'What is included in the on-road price?',
   'Ex-showroom price + RTO road tax and registration + first-year insurance + other charges such as number plates and FASTag. Accessories and extended warranty are extra if you choose them. Our on-road figures are estimates; dealer quotations list every charge separately.'),
  ('any-hidden-charges', 'pricing', 60, false, 'Will I pay any hidden charges?',
   'Not to us. GroupDrive charges customers nothing. Quotations must itemise every charge the dealer asks for, so you can question anything you don''t want, such as optional accessories.'),

  -- Dealer quotations
  ('how-are-quotations-checked', 'quotations', 10, true, 'How are quotations checked?',
   'Dealer quotations must be itemised (ex-showroom price, registration and road tax, insurance, accessories and other charges). Our team reviews each quotation before it is published to verified participants. Draft or unreviewed quotations are never shown as offers.'),
  ('which-dealers', 'quotations', 20, false, 'Which dealers quote?',
   'Only authorised dealerships for that brand in the group''s city whose authorisation we have verified.'),
  ('how-long-valid', 'quotations', 30, false, 'How long is a quotation valid?',
   'Each quotation shows a validity date set by the dealership. Prices and offers can change after that date.'),
  ('compare-quotations', 'quotations', 40, false, 'Can I compare quotations from different dealers?',
   'Yes. Every published quotation in a group uses the same line items, so you can compare them side by side.'),
  ('phone-number-shared', 'quotations', 50, false, 'Will dealers see my phone number?',
   'Not unless you choose to contact a dealership about a published quotation. Other participants never see your details. Dealers only receive the contact details you agree to share when you send an enquiry.'),

  -- Buying & delivery
  ('who-sells-the-vehicle', 'buying', 10, true, 'Who sells me the vehicle?',
   'You buy directly from an authorised dealership. The final on-road price, offers, stock, financing, insurance, registration and delivery are confirmed by the dealership, not by GroupDrive.'),
  ('do-i-pay-groupdrive', 'buying', 20, false, 'Do I pay GroupDrive anything when I buy?',
   'No. You pay the dealership directly. We never collect booking amounts or vehicle payments.'),
  ('test-drive', 'buying', 30, false, 'Can I take a test drive?',
   'Yes. Use **Book Test Drive** on any car page, or arrange one with the dealership after you receive a quotation.'),
  ('exchange-old-car', 'buying', 40, false, 'Can I exchange my old car?',
   'Exchange is handled by the dealership. Mention it when you contact them; exchange value is negotiated separately from the group quotation.'),
  ('delivery-time', 'buying', 50, false, 'How long does delivery take?',
   'Delivery depends on the dealership''s stock and the manufacturer''s waiting period for your variant and colour. The dealership confirms timelines when you book.'),
  ('booking-cancellation', 'buying', 60, false, 'What if I cancel a booking?',
   'Booking and cancellation terms are set by the dealership. Read them before paying a booking amount.'),

  -- Loans & EMI
  ('how-is-emi-calculated', 'loans', 10, false, 'How is the EMI calculated?',
   'We use the standard reducing-balance formula: EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), where P is the loan amount, r is the monthly interest rate and n the number of months. Try the [EMI calculator](/emi-calculator).'),
  ('emi-assumptions', 'loans', 20, false, 'What assumptions do the "EMI from" figures use?',
   'Car cards assume a 20% down payment, 9.5% annual interest and a 5-year tenure on the estimated on-road price. Your actual rate depends on the lender and your credit profile.'),
  ('down-payment', 'loans', 30, false, 'How much down payment should I make?',
   'Lenders typically finance 80–90% of the on-road price. A larger down payment lowers your EMI and total interest.'),
  ('loan-help', 'loans', 40, false, 'Can you help me get a car loan?',
   'Yes. Tap **Car Loan** or **Get loan offers** on any car page and we''ll connect you with lenders. You''re free to use your own bank instead.'),
  ('loan-tenure', 'loans', 50, false, 'What loan tenure can I choose?',
   'Usually 1 to 7 years. A longer tenure lowers the EMI but increases the total interest you pay.'),

  -- Insurance
  ('insurance-included', 'insurance', 10, false, 'Is insurance included in the on-road price?',
   'First-year insurance is part of the on-road price. Dealer quotations list it as a separate line so you can compare it.'),
  ('buy-own-insurance', 'insurance', 20, false, 'Can I buy insurance myself instead of from the dealer?',
   'In most cases yes — ask the dealership. Use **Insurance** on a car page if you''d like quotes.'),
  ('add-ons', 'insurance', 30, false, 'Which insurance add-ons are worth considering?',
   'Common add-ons include zero depreciation, engine protection, roadside assistance and return-to-invoice. Check what each covers and its cost before adding it.'),

  -- Account & privacy
  ('what-data', 'account', 10, false, 'What personal details do you collect?',
   'Your name, email, mobile number and city, so we can verify that group members are real local buyers. See our [privacy policy](/privacy).'),
  ('who-sees-my-details', 'account', 20, false, 'Who can see my details?',
   'Only GroupDrive staff. Other participants never see who else is in a group, and dealers only see details you choose to share.'),
  ('delete-account', 'account', 30, false, 'How do I delete my account?',
   'Contact us from the [contact page](/contact) and we''ll delete your account and personal data, except records we must keep by law.'),
  ('saved-cars', 'account', 40, false, 'Where do I find cars I''ve saved?',
   'Tap the heart on any car to save it. Saved cars are listed under **Saved cars** in your dashboard.'),

  -- For dealers
  ('dealer-partner', 'dealers', 10, false, 'How can my dealership partner with GroupDrive?',
   'Authorised dealerships can [contact us](/contact). We verify your authorisation and set up a written commission agreement before you receive any quotation requests.'),
  ('dealer-commission', 'dealers', 20, false, 'How does GroupDrive earn money?',
   'From a commission paid by the dealership only after a verified completed sale, under a written agreement. Customers never pay us.'),
  ('dealer-quote-format', 'dealers', 30, false, 'What must a dealer quotation include?',
   'An itemised ex-showroom price and every other charge (registration and road tax, insurance, accessories, other charges), what is included and excluded, and a validity date. We review it before publishing.')
on conflict (slug) where slug is not null do nothing;

-- New home hero copy, unless an admin has already changed it.
update public.app_settings
   set value = jsonb_build_object(
     'eyebrow', 'Group buying for new cars in Surat',
     'headline', 'Buy Your New Car as a Group',
     'subheadline', 'Join other buyers who want the same car in your city. We take the group to authorised dealers and bring back their best offer.')
 where key = 'home.hero'
   and value->>'headline' = 'Buy your next vehicle together, decide with clearer quotes.';

-- Optional hero background photo (leave url empty to use the built-in illustration).
insert into public.app_settings (key, value, description, is_public)
values ('home.hero_image', '{"url": "", "alt": ""}'::jsonb,
        'Home hero background photo: a licensed image URL (e.g. from the vehicle-images bucket) and its alt text.', true)
on conflict (key) do nothing;
