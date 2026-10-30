#!/bin/bash
# Refreshes supabase/catalogue/sources/nissan from nissan.in/prices-list.html.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); OUT=$(cd "$HERE/../../.." && pwd)/supabase/catalogue/sources/nissan
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
curl -sS -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36" -o "$WORK/prices.html" https://www.nissan.in/prices-list.html
python3 -I "$HERE/build.py" "$WORK/prices.html" "$OUT"
python3 -I "$HERE/../report.py" "$OUT"
