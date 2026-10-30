#!/bin/bash
# Refreshes supabase/catalogue/sources/maruti from the official Maruti Suzuki sites
# (marutisuzuki.com and nexaexperience.com). Prices are ex-showroom for Surat.
# Usage: bash scripts/catalogue/maruti/refresh.sh
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$(cd "$HERE/../../.." && pwd)/supabase/catalogue/sources/maruti
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/pages" "$WORK/raw"
bash "$HERE/fetch-pages.sh" "$WORK/pages"
bash "$HERE/fetch-feeds.sh" "$WORK/raw"
python3 -I "$HERE/build.py" "$WORK/raw" "$WORK/pages" "$OUT"
python3 -I "$HERE/report.py" "$OUT"
