#!/bin/bash
# Refreshes supabase/catalogue/sources/hyundai from hyundai.com/in (Surat prices, engine
# specifications) and the official brochures (features, colours). Needs pdftotext (poppler).
# Usage: bash scripts/catalogue/hyundai/refresh.sh
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$(cd "$HERE/../../.." && pwd)/supabase/catalogue/sources/hyundai
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/raw" "$WORK/brochures"
bash "$HERE/fetch-feeds.sh" "$WORK/raw"
bash "$HERE/fetch-brochures.sh" "$WORK/brochures"
python3 -I "$HERE/build.py" "$WORK/raw" "$WORK/brochures" "$OUT"
python3 -I "$HERE/../report.py" "$OUT"
