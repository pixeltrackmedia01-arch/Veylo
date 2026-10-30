# build.py RAW_DIR OUT_DIR : MG Motor India variants with ex-showroom prices (one national price;
# MG's calculator adds city taxes separately) and brochure links.
import datetime, json, os, re, sys

raw, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
BODY = {"COMET": "Hatchback (EV)", "WINDSOR": "MUV (EV)", "ZS": "SUV (EV)", "ASTOR": "SUV", "HECTOR": "SUV", "MAJESTOR": "SUV"}
brochures = [l.strip() for l in open(os.path.join(raw, "brochures.txt")) if l.strip()]
models = json.load(open(os.path.join(raw, "models.json")))["models"]


def brochure(name):
    key = name.replace("MG ", "").replace(" ", "").lower()
    hits = [b for b in brochures if key in b.replace("%20", "").lower() and "accessor" not in b.lower() and "shield" not in b.lower()]
    return sorted(hits, key=len)[0] if hits else None


index = []
for m in models:
    name = m["carName"].replace("MG ", "")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    variants = []
    for v in sorted(m["variants"], key=lambda v: v["exShowroomPrice"]):
        fuel = v.get("fuelType", "").title().replace("Ev", "Electric")
        variants.append({"code": v["modelSalesCode"], "name": f"{name} {v['variantName'].title()}",
                         "fuel": "Electric" if "EV" in m["carName"].upper() or fuel.upper().startswith("ELEC") else fuel,
                         "transmission": {"AT": "Automatic", "MT": "Manual", "CVT": "CVT", "DCT": "DCT"}.get(v.get("transmission"), v.get("transmission")),
                         "ex_showroom_surat": {"standard": int(v["exShowroomPrice"])}, "specifications": {}, "features": {}})
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    data = {"brand": "MG", "model": name, "slug": slug, "official_page": "https://www.mgmotor.co.in/",
            "brochure_pdf": brochure(m["carName"]), "price_city": "Surat, Gujarat (MG lists one ex-showroom price nationally)",
            "ex_showroom_min": min(prices), "ex_showroom_max": max(prices),
            "fuel_types": sorted({v["fuel"] for v in variants}), "transmissions": sorted({v["transmission"] for v in variants if v["transmission"]}),
            "colours": [], "variants": variants, "notes": [], "fetched_on": datetime.date.today().isoformat()}
    json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    body = next((b for k, b in BODY.items() if k in m["modelLine"].upper()), "SUV")
    index.append({"model": name, "slug": slug, "channel": body, "variants": len(variants), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": data["fuel_types"],
                  "transmissions": data["transmissions"], "brochure_pdf": data["brochure_pdf"]})
    print(f"{name:<12} {len(variants):>2} variants {min(prices)/1e5:6.2f}-{max(prices)/1e5:6.2f} lakh brochure={'yes' if data['brochure_pdf'] else 'no'}")
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
