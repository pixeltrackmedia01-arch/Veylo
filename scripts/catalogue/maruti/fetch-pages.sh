#!/bin/bash
# fetch.sh OUTDIR : downloads model and price pages for every Maruti model
OUT=$1; UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
for m in alto-k10 s-presso celerio wagon-r swift dzire eeco brezza ertiga victoris; do
  curl -sS -L -A "$UA" -o "$OUT/arena-$m.html" "https://www.marutisuzuki.com/arena/$m"
  curl -sS -L -A "$UA" -o "$OUT/arena-$m-price.html" "https://www.marutisuzuki.com/arena/$m/price"
done
for m in fronx baleno ignis jimny xl6 invicto grand-vitara e-vitara; do
  curl -sS -L -A "$UA" -o "$OUT/nexa-$m.html" "https://www.nexaexperience.com/$m"
  curl -sS -L -A "$UA" -o "$OUT/nexa-$m-price.html" "https://www.nexaexperience.com/$m/price"
done
