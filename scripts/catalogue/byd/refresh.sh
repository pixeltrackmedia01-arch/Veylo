#!/bin/bash
# Refreshes supabase/catalogue/sources/byd from api.bydautoindia.com (model pages).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); OUT=$(cd "$HERE/../../.." && pwd)/supabase/catalogue/sources/byd
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
curl -sS -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36" -H "Origin: https://www.bydautoindia.com" -o "$WORK/page.json" https://api.bydautoindia.com/page
python3 -I "$HERE/build.py" "$WORK/page.json" "$OUT"
python3 -I "$HERE/../report.py" "$OUT"
