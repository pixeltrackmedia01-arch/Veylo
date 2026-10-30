#!/bin/bash
# Refreshes supabase/catalogue/sources/ather from atherenergy.com (Ahmedabad price page data).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../.." && pwd)
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
cd "$ROOT" && node scripts/catalogue/tools/capture.mjs https://www.atherenergy.com/electric-scooter-price-in-ahmedabad "$WORK/cap" > /dev/null
f=$(python3 -I -c "import json,sys; print(next(e['file'] for e in json.load(open(sys.argv[1])) if 'price-in-ahmedabad.json' in e['url']))" "$WORK/cap/index.json")
python3 -I "$HERE/build.py" "$WORK/cap/$f" "$ROOT/supabase/catalogue/sources/ather"
python3 -I "$HERE/../report.py" "$ROOT/supabase/catalogue/sources/ather"
