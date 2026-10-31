-- =============================================================================
-- Catalogue import from the official-data payloads built by
-- scripts/catalogue/import/build_payload.py (supabase/catalogue/sources/<brand>).
--
-- public.gd_import_catalogue(payload) upserts manufacturers, vehicles, variants
-- and current Surat prices in place:
--   * vehicles match by slug, else by (manufacturer, model name); slugs of
--     existing rows are kept so public URLs don't change;
--   * variants match by slug, else by name, within the vehicle;
--   * each variant gets a new current Surat price (the previous one is kept as
--     history with is_current = false);
--   * variants of an imported vehicle that are no longer listed are unpublished
--     (never deleted), unless a group (batch) uses them.
-- public.gd_unpublish_missing(brand_slugs, keep_slugs) unpublishes vehicles of
-- the imported brands that no longer appear, again skipping any used by a batch.
-- Both run as the table owner from the SQL editor / migrations only.
-- =============================================================================

create or replace function public.gd_import_catalogue(payload jsonb)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_city uuid;
  v_mfr uuid;
  v_vehicle uuid;
  v_variant uuid;
  b jsonb; v jsonb; x jsonb;
  pool jsonb := coalesce(payload->'p', '[]');
  keys jsonb := coalesce(payload->'k', '[]');
  v_specs jsonb; v_features jsonb; v_price numeric; v_ev boolean; v_two boolean;
  v_tax numeric; v_ins numeric; v_other numeric;
  v_touched uuid[];
  i int;
  n_vehicles int := 0; n_variants int := 0; n_hidden int := 0;
begin
  select id into v_city from cities where slug = 'surat';
  if v_city is null then raise exception 'Surat city row missing'; end if;

  for b in select * from jsonb_array_elements(coalesce(payload->'brands', '[]')) loop
    insert into manufacturers (name, slug, categories, website_url, is_active)
    values (b->>'name', b->>'slug', array[(b->>'category')::vehicle_category], b->>'website', true)
    on conflict (slug) do update
      set website_url = excluded.website_url, is_active = true,
          categories = (select array_agg(distinct c) from unnest(manufacturers.categories || excluded.categories) c);
  end loop;

  for v in select * from jsonb_array_elements(payload->'v') loop
    select id into v_mfr from manufacturers where slug = v->>'b';
    if v_mfr is null then raise exception 'Unknown manufacturer %', v->>'b'; end if;
    v_two := v->>'c' = 'two_wheeler';

    select id into v_vehicle from vehicles
     where slug = v->>'s' or (manufacturer_id = v_mfr and lower(model_name) = lower(v->>'m'))
     order by (slug = v->>'s') desc limit 1;
    if v_vehicle is null then
      insert into vehicles (manufacturer_id, model_name, slug, category, body_type, description, summary, highlights,
                            colours, status, is_demo, published_at)
      values (v_mfr, v->>'m', v->>'s', (v->>'c')::vehicle_category, v->>'t', v->>'y', v->>'y',
              array(select jsonb_array_elements_text(v->'h')), coalesce(v->'o', '[]'), 'published', false, now())
      returning id into v_vehicle;
    else
      update vehicles set model_name = v->>'m', category = (v->>'c')::vehicle_category, body_type = v->>'t',
             description = v->>'y', summary = v->>'y', highlights = array(select jsonb_array_elements_text(v->'h')),
             colours = case when jsonb_array_length(coalesce(v->'o', '[]')) > 0 then v->'o' else colours end,
             status = 'published', is_demo = false, published_at = coalesce(published_at, now())
       where id = v_vehicle;
    end if;
    n_vehicles := n_vehicles + 1;

    v_touched := '{}';
    i := 0;
    for x in select * from jsonb_array_elements(v->'x') loop
      -- x: [name, slug, fuel, trans, cc, price, dual, specIdx, featIdx, roadTax, insurance, other]
      select coalesce(jsonb_object_agg(keys->>((kv->>0)::int), kv->1), '{}') into v_specs
        from jsonb_array_elements(v->'q'->((x->>7)::int)) kv;
      if jsonb_typeof(x->8) = 'number' then
        select coalesce(jsonb_object_agg(sec.key,
                 (select jsonb_agg(pool->((s.value)::int)) from jsonb_array_elements_text(sec.value) s)), '{}')
          into v_features
          from jsonb_each(v->'f'->((x->>8)::int)) sec;
      else
        v_features := '{}';
      end if;

      select id into v_variant from vehicle_variants
       where vehicle_id = v_vehicle and (slug = x->>1 or lower(name) = lower(x->>0))
       order by (slug = x->>1) desc limit 1;
      if v_variant is null then
        insert into vehicle_variants (vehicle_id, name, slug, fuel_type, transmission, engine_cc, specifications, features,
                                      specs_source, specs_verified_at, status, sort_order)
        values (v_vehicle, x->>0, x->>1, x->>2, x->>3, nullif(x->>4, '')::int, v_specs, v_features,
                'Official manufacturer website / brochure', current_date, 'published', i)
        returning id into v_variant;
      else
        update vehicle_variants set name = x->>0, fuel_type = x->>2, transmission = x->>3,
               engine_cc = nullif(x->>4, '')::int, specifications = v_specs, features = v_features,
               specs_source = 'Official manufacturer website / brochure', specs_verified_at = current_date,
               status = 'published', sort_order = i
         where id = v_variant;
      end if;
      v_touched := v_touched || v_variant;
      n_variants := n_variants + 1;

      -- Surat on-road estimate around the official ex-showroom price: Gujarat road tax 6%
      -- (EVs exempt), indicative first-year insurance, registration/handling. Brands that
      -- publish these (Ola, Ather) supply them in the payload.
      v_price := (x->>5)::numeric;
      v_ev := x->>2 = 'electric';
      v_tax := coalesce((x->>9)::numeric, case when v_ev then 0 else round(v_price * 0.06) end);
      v_ins := coalesce((x->>10)::numeric,
                 round(v_price * case when v_two then 0.07 when v_ev then 0.03 else 0.035 end / 100) * 100);
      v_other := coalesce((x->>11)::numeric, case when v_two then 1500 else 5000 end);
      update vehicle_prices set is_current = false where variant_id = v_variant and city_id = v_city and is_current;
      insert into vehicle_prices (variant_id, city_id, ex_showroom, registration_road_tax, insurance, other_charges,
                                  price_kind, source, verified_at, is_current, is_demo, notes)
      values (v_variant, v_city, v_price, v_tax, v_ins, v_other, 'indicative', v->>'src', current_date, true, false,
              'Ex-showroom price from the manufacturer''s official website. On-road estimate adds Gujarat road tax'
              || case when v_ev then ' (EV exemption)' else ' (6%)' end
              || ', indicative first-year insurance and registration. Confirm the final price with the dealer.'
              || case when x->>6 is not null and x->>6 <> 'null' then ' Dual-tone paint: ₹' || (x->>6) || ' ex-showroom.' else '' end);
      i := i + 1;
    end loop;

    update vehicle_variants vv set status = 'unpublished'
     where vv.vehicle_id = v_vehicle and vv.status = 'published' and not (vv.id = any (v_touched))
       and not exists (select 1 from batches bt where bt.variant_id = vv.id);
    get diagnostics i = row_count;
    n_hidden := n_hidden + i;
  end loop;

  return jsonb_build_object('vehicles', n_vehicles, 'variants', n_variants, 'variants_unpublished', n_hidden);
end;
$$;

create or replace function public.gd_unpublish_missing(brand_slugs text[], keep_slugs text[])
returns int
language plpgsql
set search_path = public, pg_temp
as $$
declare n int;
begin
  update vehicles ve set status = 'unpublished'
   where ve.status = 'published'
     and ve.manufacturer_id in (select id from manufacturers where slug = any (brand_slugs))
     and not (ve.slug = any (keep_slugs))
     and not exists (select 1 from batches bt join vehicle_variants vv on vv.id = bt.variant_id where vv.vehicle_id = ve.id);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.gd_import_catalogue(jsonb) from public, anon, authenticated;
revoke all on function public.gd_unpublish_missing(text[], text[]) from public, anon, authenticated;
