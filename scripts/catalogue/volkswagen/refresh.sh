#!/bin/bash
# Refreshes supabase/catalogue/sources/volkswagen from volkswagen.co.in price tables.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); OUT=$(cd "$HERE/../../.." && pwd)/supabase/catalogue/sources/volkswagen
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
bash "$HERE/fetch.sh" "$WORK"
python3 -I "$HERE/build.py" "$WORK" "$OUT"
python3 -I "$HERE/../report.py" "$OUT"
