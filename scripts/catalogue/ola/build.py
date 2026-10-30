# build.py PRICES_JSON OUT_DIR : Ola Electric products with Gujarat ex-showroom prices (and RTO,
# insurance, handling as published) from olaelectric.com/products/index/getpricedetails.
import datetime, json, os, re, sys

src, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
num = lambda s: int(re.sub(r"\D", "", str(s)) or 0)
guj = next(s for s in json.load(open(src))["data"] if s["state"].strip().lower() == "gujarat")
families = {}
for code, p in guj["products"].items():
    name = p["product_name"].strip()
    family = "Roadster" if "roadster" in name.lower() or "roadster" in code else re.sub(r"\s*(Pro|Air|X\+?|Plus)?\s*(\d[\d.]*\s*kWh)?\s*(Gen\s*\d+)?$", "", name, flags=re.I).strip() or name
    families.setdefault(family, []).append((code, p))
index = []
for family, items in families.items():
    slug = "ola-" + re.sub(r"[^a-z0-9]+", "-", family.lower()).strip("-")
    variants = []
    for code, p in sorted(items, key=lambda x: num(x[1]["ex_showroom"])):
        if not num(p["ex_showroom"]):
            continue
        label = p["product_name"] + ("" if "gen" not in code else f" ({code.split('_')[-1].replace('gen', 'Gen ')})")
        variants.append({"code": code, "name": f"Ola {label}", "fuel": "Electric", "transmission": "Automatic",
                         "ex_showroom_surat": {"standard": num(p["ex_showroom"])},
                         "on_road_gujarat": {"rto": num(p["rto"]), "insurance": num(p["insurance"]), "handling": num(p["handling_charges"]),
                                             "total": num(p["effective_on_road"])},
                         "specifications": {}, "features": {}})
    if not variants:
        continue
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    doc = {"brand": "Ola Electric", "model": family if family.startswith("Ola") else f"Ola {family}", "slug": slug,
           "official_page": "https://www.olaelectric.com/", "brochure_pdf": None, "price_city": "Gujarat (state price list from olaelectric.com)",
           "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": ["Electric"], "transmissions": ["Automatic"],
           "colours": [], "variants": variants, "notes": [], "fetched_on": datetime.date.today().isoformat()}
    json.dump(doc, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": doc["model"], "slug": slug, "channel": "Electric motorcycle" if family == "Roadster" else "Electric scooter",
                  "variants": len(variants), "colours": 0, "ex_showroom_min": min(prices), "ex_showroom_max": max(prices),
                  "fuel_types": ["Electric"], "transmissions": ["Automatic"], "brochure_pdf": None})
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
for m in index: print(f"{m['model']:<18} {m['variants']:>2} variants {m['ex_showroom_min']/1e5:5.2f}-{m['ex_showroom_max']/1e5:5.2f} lakh")
