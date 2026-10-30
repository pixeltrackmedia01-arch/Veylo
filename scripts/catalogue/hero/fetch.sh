#!/bin/bash
# fetch.sh OUTDIR : Hero MotoCorp specification feed (all scooters and motorcycles with specs and
# price range). heromotocorp.com blocks plain requests, so the page is opened in a browser and
# the feed it loads is kept. Run from the repo root.
OUT=$1
node scripts/catalogue/tools/capture.mjs https://www.heromotocorp.com/en-in/motorcycles.html "$OUT/cap" > /dev/null
f=$(python3 -I -c "import json,sys; print(next(e['file'] for e in json.load(open(sys.argv[1])) if 'vehiclespecifications' in e['url']))" "$OUT/cap/index.json")
cp "$OUT/cap/$f" "$OUT/specs.json"
