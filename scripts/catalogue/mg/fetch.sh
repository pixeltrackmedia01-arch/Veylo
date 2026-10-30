#!/bin/bash
# fetch.sh OUTDIR : MG Motor India models + variants with ex-showroom prices. The feed behind
# mgmotor.co.in's on-road price calculator needs the page's key, so the page is opened in a
# browser (capture.mjs) and that response is kept. Also saves brochure links. Run from repo root.
OUT=$1; UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
node scripts/catalogue/tools/capture.mjs https://www.mgmotor.co.in/tools/mg-cars-on-road-price-calculator "$OUT/cap" > /dev/null
f=$(python3 -I -c "import json,sys; print(next(e['file'] for e in json.load(open(sys.argv[1])) if e['url'].endswith('/prod/models')))" "$OUT/cap/index.json")
cp "$OUT/cap/$f" "$OUT/models.json"
curl -sS -A "$UA" https://www.mgmotor.co.in/tools/brochures | grep -oE 'https://s7ap1\.scene7\.com/[^"]+\.pdf' | sort -u > "$OUT/brochures.txt"
