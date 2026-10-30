#!/bin/bash
# Refreshes supabase/catalogue/sources/mahindra from auto.mahindra.com and
# mahindraelectricsuv.com (variants, prices, colours) and the brochures (spec lines).
# Usage: bash scripts/catalogue/mahindra/refresh.sh   (needs pdftotext)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$(cd "$HERE/../../.." && pwd)/supabase/catalogue/sources/mahindra
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/raw" "$WORK/brochures"
python3 -I "$HERE/fetch.py" "$WORK/raw"
bash "$HERE/fetch-brochures.sh" "$WORK/brochures" 2>/dev/null
python3 -I "$HERE/build.py" "$WORK/raw" "$WORK/brochures" "$OUT"
python3 -I "$HERE/../report.py" "$OUT"
