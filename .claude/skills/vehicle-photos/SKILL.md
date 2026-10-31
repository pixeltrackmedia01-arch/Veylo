---
name: vehicle-photos
description: Add user-supplied car/bike photos (Google Drive folder, one sub-folder per model) to the live site with minimal tokens - source check, dedupe, WebP, Supabase upload, vehicle_images rows. Use when the user shares a Drive folder or files of vehicle images.
---

# Vehicle photos → live site (low-token)

Never paste listings or images into context; work from files. View only one contact sheet per batch.

1. **List** (one call): `search_files` with `parentId = '<root>'` for model folders, then one
   call `parentId = 'A' or parentId = 'B' …` with `excludeContentSnippets: true, pageSize: 300`.
   Large results auto-save to a file — use that path.
2. **Source check (mandatory):** `python3 -I scripts/catalogue/images/source_check.py <listing.json>`.
   Exit 1 = car-portal photos (CarDekho/CarWale/BikeDekho/BikeWale naming like `steering-wheel-54`,
   `STEALTH-BLACK_080808`). Stop and tell the user; do not download, edit, filter or upload them —
   altering copied photos does not make them usable. Unknown origin (blogs, no metadata): ask.
   OK sources: user's own photos, brand press/media kits, dealer image packs.
3. **Download** to the scratchpad: `https://drive.usercontent.google.com/download?id=<id>&export=download&confirm=t`
   (`xargs -P 8`), one dir per model slug (map folder names to slugs with one SQL query on `vehicles`).
4. **Prepare:** `scripts/catalogue/images/prep_photos.py` pattern — trim screenshot edges, drop
   near-duplicates (dHash ≤ 6), hero = best studio front-¾ shot, WebP q82 max 1280 px,
   files `<slug>-<n>.webp`. Pick the hero and exclusions from ONE contact sheet (PIL, ~240px tiles).
5. **Upload:** temporary storage policy for anon insert limited to the exact vehicle-id folders and
   `^…/<prefix>-[a-z0-9-]+-[0-9]+\.webp$`; POST to `/storage/v1/object/vehicle-images/<vehicle_id>/<file>`
   with the anon key; then **drop the policy** in the same SQL that inserts rows.
6. **Rows:** insert `vehicle_images` from `storage.objects` (sort_order = n, alt "<Brand> <Model> front
   three-quarter view" for n=1 else "— photo n", `attribution` = real source). Placeholders sort 999.
7. **Verify:** `select count(*) from pg_policies where policyname like 'tmp %'` = 0. Site serves images
   unoptimized from Supabase CDN (never re-enable Next image optimisation — it 503s on Hostinger).
   Public cache refreshes within 5 min.
