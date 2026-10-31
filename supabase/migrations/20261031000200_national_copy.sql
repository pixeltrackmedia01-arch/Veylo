-- Site copy for an all-India audience: the catalogue covers every city, so the
-- hero and FAQs no longer read as Surat-only. (Applied live 2026-10-31.)

update public.app_settings
   set value = jsonb_set(value, '{eyebrow}', '"New car & bike prices across India"'), updated_at = now()
 where key = 'home.hero' and value->>'eyebrow' = 'Now live in Surat';

update public.faqs
   set answer = 'GroupDrive lists new car, bike and scooter prices, variants and specifications for buyers across India. Buying groups are formed city by city, because on-road prices, road tax and dealerships differ by city and state. Join a group for your city or tell us where you are so we can open one there.',
       updated_at = now()
 where question = 'Which cities do you cover?' and answer like 'We are live in Surat%';

update public.faqs
   set answer = 'No. Model pages show **indicative** ex-showroom prices from the manufacturer and an estimated on-road price, with the date we last checked them. Road tax, registration and insurance differ by state and city, so the dealership confirms the final price, offers and availability.',
       updated_at = now()
 where question = 'Are the prices on car pages final?' and answer like '%estimated on-road price for Surat%';

-- Imported model summaries and price sources: drop the price-city wording
-- (prices stay stored against the Surat price city; only the text changes).
update public.vehicles
   set summary = replace(regexp_replace(regexp_replace(summary, ' \(Surat, Gujarat( \([^)]*\))?\)\.', '.'),
                   'Ex-showroom prices are (₹[^.]*(\.\d+)? [Ll]akh|₹[0-9,]+)\.', 'The ex-showroom price is \1.'),
                 'Join a group on GroupDrive to get a better on-road price when buyers in Surat book together.',
                 'Join a buying group on GroupDrive in your city to get a better on-road price when buyers book together.')
 where summary ilike '%surat%';

update public.vehicle_prices
   set source = regexp_replace(source, ' — Surat, Gujarat.*$', '')
 where source like '% — Surat, Gujarat%';
