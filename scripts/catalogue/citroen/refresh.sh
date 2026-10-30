#!/bin/bash
# Refreshes supabase/catalogue/sources/citroen from api.citroenindia.com.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); OUT=$(cd "$HERE/../../.." && pwd)/supabase/catalogue/sources/citroen
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
python3 -I "$HERE/fetch.py" "$WORK"
python3 -I "$HERE/build.py" "$WORK" "$OUT"
python3 -I "$HERE/../report.py" "$OUT"
