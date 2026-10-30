#!/bin/bash
# feeds.sh OUTDIR : Surat (forCode 40) prices + variant/spec/feature feeds per model
OUT=$1; UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
get() { curl -sS -A "$UA" -H "Accept: application/json" -o "$1" -w "%{http_code} $(basename $1)\n" "$2"; sleep 1; }
A=https://www.marutisuzuki.com; N=https://www.nexaexperience.com
for m in AT SP CL WA SI DE VR VZ ER EC; do
  get $OUT/$m-price.json   "$A/pricing/v2/common/pricing/ex-showroom-detail?forCode=40&channel=NRM%2CNRC&variantInfoRequired=true&modelCodes=$m"
  get $OUT/$m-variants.json "$A/graphql/execute.json/msil-platform/arenaVariantList;modelCd=$m"
  get $OUT/$m-compare.json "$A/graphql/execute.json/msil-platform/ArenaVariantDetailCompare;modelCd=$m;channel=NRM;locale=en;"
  get $OUT/$m-features.json "$A/graphql/execute.json/msil-platform/VariantFeaturesList;modelCd=$m;locale=en;"
done
for m in BZ FR GV IN JM XL VE; do
  get $OUT/$m-price.json   "$N/pricing/v2/common/pricing/ex-showroom-detail?forCode=40&channel=EXC&variantInfoRequired=true&modelCodes=$m"
  get $OUT/$m-variants.json "$N/graphql/execute.json/msil-platform/CarVariantByModelCd;modelCd=$m"
  get $OUT/$m-compare.json "$N/graphql/execute.json/msil-platform/VariantDetailCompare;modelCd=$m;channel=EXC;locale=en;"
  get $OUT/$m-features.json "$N/graphql/execute.json/msil-platform/VariantFeaturesList;modelCd=$m;locale=en;"
done
get $OUT/nexa-carlist.json "$N/graphql/execute.json/msil-platform/NexaCarList"
get $OUT/arena-carlist.json "$A/graphql/execute.json/msil-platform/ArenaCarList"
