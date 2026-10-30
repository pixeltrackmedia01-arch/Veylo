#!/bin/bash
# fetch-brochures.sh OUTDIR : downloads the brochures listed in brochures.txt (code url) as text.
HERE=$(cd "$(dirname "$0")" && pwd); OUT=$1
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
while read -r pid url; do
  curl -sS -L -A "$UA" -o "$OUT/$pid.pdf" "$url" && pdftotext -layout "$OUT/$pid.pdf" "$OUT/$pid.txt" || echo "FAIL $pid"
  sleep 1
done < "$HERE/brochures.txt"
