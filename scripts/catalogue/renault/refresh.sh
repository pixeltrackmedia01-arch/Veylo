#!/bin/bash
# Refreshes supabase/catalogue/sources/renault from Renault's official price sheets.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../.." && pwd)
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
cd "$ROOT" && bash "$HERE/fetch.sh" "$WORK"
python3 "$HERE/build.py" "$WORK" "$ROOT/supabase/catalogue/sources/renault"
python3 -I "$HERE/../report.py" "$ROOT/supabase/catalogue/sources/renault"
