#!/bin/bash
# Refreshes supabase/catalogue/sources/honda (Surat prices from hondacarindia.com; ~10 minutes,
# because each grade/gearbox combination is checked). Usage: bash scripts/catalogue/honda/refresh.sh
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); OUT=$(cd "$HERE/../../.." && pwd)/supabase/catalogue/sources/honda
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
python3 -I "$HERE/fetch.py" "$WORK"
python3 -I "$HERE/build.py" "$WORK" "$OUT"
python3 -I "$HERE/../report.py" "$OUT"
