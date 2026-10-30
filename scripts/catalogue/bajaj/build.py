# build.py RAW_DIR OUT_DIR : Bajaj Auto models with Gujarat ex-showroom prices.
import datetime, json, os, re, sys

raw, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
groups = {}
for m in json.load(open(os.path.join(raw, "models.json"))):
    if not m.get("price"):
        continue
    family = m["ModelUrl"].strip("/").split("/")[1] if m["ModelUrl"].count("/") >= 2 else m["ModelName"]
    groups.setdefault(family, []).append(m)
index = []
for family, ms in groups.items():
    name = family.replace("bajaj-", "").replace("-", " ").title().replace("Ns", "NS").replace("Rs", "RS").replace("Ct", "CT")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    ev = "chetak" in family.lower()
    variants = [{"code": m["ModelCode"], "name": (m.get("variant_name") or m["ModelName"]).replace("Bajaj ", ""), "fuel": "Electric" if ev else ("CNG" if "freedom" in family.lower() else "Petrol"),
                 "transmission": None, "ex_showroom_surat": {"standard": m["price"]}, "specifications": {}, "features": {}}
                for m in sorted(ms, key=lambda m: m["price"])]
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    doc = {"brand": "Bajaj", "model": name, "slug": slug, "official_page": "https://www.bajajauto.com" + ms[0]["ModelUrl"], "brochure_pdf": None,
           "price_city": "Gujarat (state ex-showroom price from bajajauto.com)", "ex_showroom_min": min(prices), "ex_showroom_max": max(prices),
           "fuel_types": sorted({v["fuel"] for v in variants}), "transmissions": [], "colours": [], "variants": variants, "notes": [],
           "fetched_on": datetime.date.today().isoformat()}
    json.dump(doc, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": "Electric scooter" if ev else "Motorcycle", "variants": len(variants), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": doc["fuel_types"], "transmissions": [], "brochure_pdf": None})
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
print(len(index), "families,", sum(m["variants"] for m in index), "models/variants")
