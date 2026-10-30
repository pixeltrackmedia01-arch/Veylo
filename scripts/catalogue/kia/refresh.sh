#!/bin/bash
# Refreshes supabase/catalogue/sources/kia from kia.com/in (configurator feed: Surat prices by
# paint type, colours, engines; brochure links). Usage: bash scripts/catalogue/kia/refresh.sh
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$(cd "$HERE/../../.." && pwd)/supabase/catalogue/sources/kia
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
python3 -I "$HERE/fetch.py" "$WORK"
python3 -I "$HERE/build.py" "$WORK" "$OUT"
python3 -I "$HERE/../report.py" "$OUT"
