-- Original home hero copy (replaces the earlier wording unless an admin has changed it).
update public.app_settings
   set value = jsonb_build_object(
     'eyebrow', 'Now live in Surat',
     'headline', 'Better car deals happen in numbers',
     'highlight', 'in numbers',
     'subheadline', 'Team up with buyers who want the same model. Dealers compete for the whole group, and you decide whether to buy — free, no strings attached.')
 where key = 'home.hero'
   and value->>'headline' in ('Buy Your New Car as a Group', 'Buy your next vehicle together, decide with clearer quotes.');
