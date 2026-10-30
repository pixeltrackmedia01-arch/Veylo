#!/bin/bash
# fetch.sh OUTDIR : Renault India official price sheets (one .xlsx per model, every city),
# downloaded through each model's price page (the sheets only load in the site's session).
# Run from the repo root.
OUT=$1; UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
B=https://www.renault.co.in
for m in renault-kwid renault-triber renault-kiger renault-duster duster-strong-hybrid-e-tech; do
  page=$(curl -sS -A "$UA" "$B/cars/$m.html" | grep -oE "href=\"/cars/[a-z0-9-]+/[a-z0-9-]*price[a-z0-9-]*\.html\"" | head -1 | cut -d'"' -f2)
  [ -n "$page" ] || { echo "no price page: $m"; continue; }
  node scripts/catalogue/tools/browser_download.mjs "$B$page" "$OUT" 'Tariff.*\.xlsx' | cut -d' ' -f1-2
  sleep 1
done
