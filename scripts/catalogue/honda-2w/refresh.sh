#!/bin/bash
# Refreshes supabase/catalogue/sources/honda-2w from honda2wheelersindia.com (Gujarat prices).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../.." && pwd)
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
cd "$ROOT" && node "$HERE/fetch.mjs" "$WORK"
python3 -I "$HERE/build.py" "$WORK" "$ROOT/supabase/catalogue/sources/honda-2w"
python3 -I "$HERE/../report.py" "$ROOT/supabase/catalogue/sources/honda-2w"
