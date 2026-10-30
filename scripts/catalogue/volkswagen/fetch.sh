#!/bin/bash
# fetch.sh OUTDIR : Volkswagen India model pages and their price layers (variant price tables).
OUT=$1; UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
B=https://www.volkswagen.co.in
for m in virtus taigun tayron golf-gti; do
  curl -sS -A "$UA" -o "$OUT/$m.html" "$B/en/models/$m.html"
  layer=$(grep -oE 'href="[^"]*__layer/layers/price/[^"]+"' "$OUT/$m.html" | head -1 | cut -d'"' -f2)
  [ -n "$layer" ] && curl -sS -A "$UA" -o "$OUT/$m-price.html" "$B$layer" || echo "no price layer: $m"
  sleep 1
done
