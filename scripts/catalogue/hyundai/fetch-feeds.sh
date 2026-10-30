#!/bin/bash
# hyundai-feeds.sh OUTDIR : Surat prices and per-engine specifications for every Hyundai India model
OUT=$1; UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
API=https://api.hyundai.co.in/service/price; WS=https://www.hyundai.com/wsvc/in/pip
H=(-H "Origin: https://www.hyundai.com" -H "Referer: https://www.hyundai.com/")
get() { curl -sS -A "$UA" "${H[@]}" -o "$1" -w "%{http_code} $(basename "$1")\n" "$2"; sleep 1; }
get "$OUT/models.json" "$API/getModels?loc=IN&lan=en"
SURAT=1553   # Surat, Gujarat in Hyundai's price service
# modelId:slug used by the website
for pair in 24:grand-i10-nios 39:i20 41:i20-n-line 35:aura 45:verna 49:bayon 50:venue 37:creta 40:alcazar 46:exter 47:creta-n-line 51:venue-n-line 44:ioniq-5 48:creta-electric; do
  id=${pair%%:*}; slug=${pair#*:}
  get "$OUT/$slug-price.json" "$API/getPriceByModelAndCity?cityId=$SURAT&modelId=$id&loc=IN&lan=en"
  get "$OUT/$slug-engines.json" "$WS/common/powertraintrim/list.html?codeType=$slug&loc=IN&lan=en"
  for seq in $(python3 -I -c "import json,sys; print(' '.join(x['value'] for x in json.load(open(sys.argv[1]))))" "$OUT/$slug-engines.json" 2>/dev/null); do
    get "$OUT/$slug-spec-$seq.json" "$WS/specification/accordian/view.html?seq=$seq&loc=IN&lan=en"
    get "$OUT/$slug-overview-$seq.json" "$WS/specification/overview/view.html?seq=$seq&loc=IN&lan=en"
  done
done
