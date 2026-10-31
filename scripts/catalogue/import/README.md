# Catalogue import

1. `python3 -I scripts/catalogue/import/build_payload.py OUT_DIR 60` — builds compact payload
   chunks (`payload-NN.json`) from `supabase/catalogue/sources/<brand>/` plus `vehicle-slugs.json`.
2. For each chunk run, in the Supabase SQL editor (or psql as the table owner):
   `select public.gd_import_catalogue($gdp$<payload JSON>$gdp$::jsonb);`
3. Then hide vehicles of the imported brands that are no longer sold:
   `select public.gd_unpublish_missing(array[<brand slugs>], array[<vehicle-slugs.json>]);`

The functions live in `supabase/migrations/20261031000100_catalogue_import_function.sql`. They
update rows in place (no deletes), keep previous prices as history, and never hide a vehicle or
variant that a group (batch) uses.
