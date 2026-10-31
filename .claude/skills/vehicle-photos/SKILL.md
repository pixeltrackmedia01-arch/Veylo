---
name: vehicle-photos
description: Add user-supplied car/bike photos (Google Drive folder, one sub-folder per model) to the live site with minimal tokens - dedupe, WebP, Supabase upload, vehicle_images rows. Use when the user shares a Drive folder or files of vehicle images.
---

# Vehicle photos → live site (low-token)

Never paste listings or images into context; work from files. View only one contact sheet per batch.

1. **List** (one call): `search_files` with `parentId = '<root>'` for model folders, then one
   call `parentId = 'A' or parentId = 'B' …` with `excludeContentSnippets: true, pageSize: 300`.
   Large results auto-save to a file — use that path.
2. **Download** to the scratchpad: `https://drive.usercontent.google.com/download?id=<id>&export=download&confirm=t`
   (`xargs -P 8`), one dir per model slug (map folder names to slugs with one SQL query on `vehicles`).
3. **Prepare:** `scripts/catalogue/images/prep_photos.py` pattern — trim screenshot edges, drop
   near-duplicates (dHash ≤ 6), hero = best studio front-¾ shot, WebP q82 max 1280 px,
   files `<slug>-<n>.webp`. Pick the hero and exclusions from ONE contact sheet (PIL, ~240px tiles).
4. **Upload:** temporary storage policy for anon insert limited to the exact vehicle-id folders and
   `^…/<prefix>-[a-z0-9-]+-[0-9]+\.webp$`; POST to `/storage/v1/object/vehicle-images/<vehicle_id>/<file>`
   with the anon key; then **drop the policy** in the same SQL that inserts rows.
5. **Rows:** insert `vehicle_images` from `storage.objects` (sort_order = n, alt "<Brand> <Model> front
   three-quarter view" for n=1 else "— photo n", `attribution` = real source). Placeholders sort 999.
6. **Verify:** `select count(*) from pg_policies where policyname like 'tmp %'` = 0. Site serves images
   unoptimized from Supabase CDN (never re-enable Next image optimisation — it 503s on Hostinger).
   Public cache refreshes within 5 min.
