#!/bin/bash
# Refreshes supabase/catalogue/sources/toyota: Surat dealer prices (webapi.toyotabharat.com)
# and the feature/spec tables on the model pages. Usage: bash scripts/catalogue/toyota/refresh.sh
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$(cd "$HERE/../../.." && pwd)/supabase/catalogue/sources/toyota
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/raw" "$WORK/pages"
python3 -I "$HERE/fetch.py" "$WORK/raw"
bash "$HERE/fetch-pages.sh" "$WORK/pages"
python3 -I "$HERE/build.py" "$WORK/raw" "$WORK/pages" "$OUT"
python3 -I "$HERE/../report.py" "$OUT"
