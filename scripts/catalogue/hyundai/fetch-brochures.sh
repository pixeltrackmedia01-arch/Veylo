#!/bin/bash
# fetch-brochures.sh OUTDIR : downloads Hyundai India brochures and converts them to text.
# The Alcazar brochure prints its feature table as three panels side by side on page 7,
# so those panels are cropped and read separately (alcazar-panels.txt).
OUT=$1; UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
B=https://www.hyundai.com/content/dam/hyundai/in/en/data/brochure
for n in grand-i10-nios i20 i20-n-line aura verna bayon venue venue-n-line creta alcazar exter creta-n-line ioniq-5 creta-ev; do
  curl -sS -L -A "$UA" -o "$OUT/$n.pdf" "$B/$n.pdf" && pdftotext -layout "$OUT/$n.pdf" "$OUT/$n.txt"
  sleep 1
done
{ echo "Key features"
  for r in "885 266" "1152 266" "1418 305"; do
    set -- $r
    pdftotext -f 7 -l 7 -layout -x "$1" -y 40 -W "$2" -H 595 "$OUT/alcazar.pdf" - | grep -v -iE '^\s*key features\s*$'
  done
} > "$OUT/alcazar-panels.txt"
