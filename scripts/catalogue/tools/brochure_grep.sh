#!/bin/bash
# brochure_grep.sh FILE.pdf : converts a brochure to text (FILE.txt) and prints only the
# useful signals: page count, feature-table header lines, spec lines and colour cells.
pdf=$1; txt=${pdf%.pdf}.txt
pdftotext -layout "$pdf" "$txt"
echo "pages: $(pdfinfo "$pdf" | awk '/^Pages/{print $2}')  words: $(wc -w < "$txt")"
echo "-- table headers"; grep -n -iE '^\s*(key features|variants?)\b' "$txt" | head -4 | cut -c1-200
echo "-- specs"; grep -n -iE 'km/l|kmpl|km/kg|range|boot|kwh|max\.? power|torque|warranty' "$txt" | sed -E 's/ {3,}/ | /g' | head -12 | cut -c1-160
echo "-- marker rows (S/●/-)"; grep -cE '(\s(S|●|-)){3,}\s*$' "$txt"
