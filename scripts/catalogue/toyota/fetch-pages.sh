#!/bin/bash
# fetch-pages.sh OUTDIR : model pages (feature and spec tables are in the HTML), saved as <priceModelId>.html
OUT=$1; UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
B=https://www.toyotabharat.com/showroom
for pair in 20:glanza/ 33:urbancruiser-taisor/ 31:rumion/ 27:urbancruiser-hyryder/ 34:urbancruiser-ebella/ \
            30:innova-crysta/ 28:innova/ 9:fortuner/index-fortuner.html 25:fortuner/index-legender.html \
            18:camry/ 21:vellfire/ 32:lc300/ 35:hilux/; do
  curl -sS -L -A "$UA" -o "$OUT/${pair%%:*}.html" "$B/${pair#*:}" || echo "FAIL $pair"
  sleep 1
done
