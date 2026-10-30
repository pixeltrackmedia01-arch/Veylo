#!/bin/bash
# fetch.sh OUTDIR : Royal Enfield motorcycle list with ex-showroom prices (the content feed a
# model page loads; it only answers the page's own request). Run from the repo root.
OUT=$1
node scripts/catalogue/tools/capture.mjs https://www.royalenfield.com/in/en/motorcycles/classic-350/ "$OUT/cap" > /dev/null
f=$(python3 -I -c "import json,sys; print(next(e['file'] for e in json.load(open(sys.argv[1])) if 'cf/api/v1/fetch' in e['url']))" "$OUT/cap/index.json")
cp "$OUT/cap/$f" "$OUT/models.json"
