#!/bin/bash
# Refreshes supabase/catalogue/sources/mg from mgmotor.co.in. Usage: bash scripts/catalogue/mg/refresh.sh
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../.." && pwd)
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
cd "$ROOT" && bash "$HERE/fetch.sh" "$WORK"
python3 -I "$HERE/build.py" "$WORK" "$ROOT/supabase/catalogue/sources/mg"
python3 -I "$HERE/../report.py" "$ROOT/supabase/catalogue/sources/mg"
