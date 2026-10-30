---
name: car-brand-data
description: Collect a car or two-wheeler brand's full Indian lineup (every variant, Surat ex-showroom price, specs, features, colours, brochure) from the brand's official website and save it under supabase/catalogue/sources/<brand>/. Use when the user pastes a brand website or names a brand to fetch.
---

# Fetch a brand's catalogue (low-token workflow)

Goal: `supabase/catalogue/sources/<brand>/` with one `<model>.json` per model, `index.json`,
`INTRO.md` and a generated `README.md`, plus `scripts/catalogue/<brand>/refresh.sh` that
re-collects it. Maruti (`maruti/`) and Hyundai (`hyundai/`) are working examples — copy
their structure, don't redesign it.

## Token rules (follow strictly)
- Never print raw HTML/JSON. Use `python3 -I scripts/catalogue/tools/peek.py FILE.json 40`
  for shape, `grep -c`/`head -c 300` for checks, `cut -c1-160` on wide lines.
- Work in the scratchpad (`$S`); keep downloads there; only final data goes in the repo.
- One probe per question. Stop exploring as soon as you have: model list, price feed,
  spec/feature source. Don't re-read files you wrote; don't re-run working steps.
- Batch fetches in one script with `sleep 1` between requests; print one status line each
  (or only failures with `| grep -v '^200'`).
- Reply to the user with one summary table + gaps. No narration of each step.

## Steps
1. **Reach + model list** (1 call): `curl -sS -o $S/home.html -w '%{http_code}' -A "$UA" URL`,
   then grep model links (`href="[^"]*/(cars|models|find-a-car|vehicles)/[a-z0-9-]+`).
   If 403/blocked/cert error: retry once via step 2 (real browser). If still blocked, tell
   the user and offer CarDekho/CarWale for facts only. Never disable TLS checks.
2. **Find the data feeds** (1 call): `node scripts/catalogue/tools/capture.mjs <model price or
   variants page> $S/<brand>/cap` → lists JSON feeds. Look for price, variant, spec, feature,
   colour feeds; `peek.py` the 2–3 promising ones. Note city/state parameters.
3. **Surat prices**: find the state/city id for Surat (Gujarat) in the feed's city list
   (`grep -o '.\{80\}Surat.\{80\}'`). Maruti: forCode=40; Hyundai: cityId=1553. If no city
   feed exists, use the brand's Gujarat/Surat price page or, last resort, Delhi prices
   (say so in INTRO.md).
4. **Specs & features**: prefer site feeds (Maruti style). If the site lacks them, use the
   official brochures: `bash scripts/catalogue/tools/brochure_grep.sh $S/x.pdf` shows whether
   a parseable feature table exists; reuse `scripts/catalogue/hyundai/hyundai_brochure.py`
   (`features(text, trims)`, `colours(text)`) — only the trim list per model is new.
5. **Write `scripts/catalogue/<brand>/`**: `fetch-*.sh` (downloads) + `build.py` (normalise) +
   `refresh.sh` (temp dir → build → `python3 -I scripts/catalogue/report.py OUT`).
6. **Validate** with one script that prints per model: variants, priced, with specs, with
   features, colours. Fix only real gaps; list the rest in INTRO.md.
7. **Save**: write `INTRO.md` (sources, gaps, discontinued models), run report.py, commit on
   the session branch and push. Don't touch the live site/database unless asked.

## Output schema (what report.py and the site importer expect)
```json
{ "brand": "Hyundai", "model": "Creta", "slug": "creta", "official_page": "…", "brochure_pdf": "…",
  "price_city": "Surat, Gujarat", "ex_showroom_min": 1090700, "ex_showroom_max": 2046000,
  "fuel_types": ["Diesel","Petrol"], "transmissions": ["AT","MT"],
  "colours": [{"name": "Atlas white", "hex": ["#fff"]}],
  "variants": [{ "name": "…", "fuel": "Petrol", "transmission": "MT", "airbags": 6,
     "ex_showroom_surat": {"standard": 1090700, "dual_tone": 1105700},
     "specifications": {"Engine": {"Max Power": "…"}}, "features": {"Safety": ["…"]} }],
  "notes": [], "fetched_on": "YYYY-MM-DD" }
```
`index.json`: list of `{model, slug, channel (showroom or body type), variants, colours,
ex_showroom_min, ex_showroom_max, fuel_types, transmissions, brochure_pdf}`.

## Rules
- Facts only (prices, specs, features, colours). Don't copy marketing text; brand photos are
  saved as reference links only — never publish them without permission.
- Keep requests polite: only the pages/feeds the site itself loads, ~1 request/second.
- Brands already done: maruti, hyundai. Reachability notes: Tata's site has an expired TLS
  certificate; Mercedes, Audi, Volvo, Porsche return 403 to scripts; BMW and MINI reset the
  connection — try `capture.mjs` (real browser) before falling back.
