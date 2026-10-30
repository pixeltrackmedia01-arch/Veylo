# build.py RAW_DIR OUT_DIR : TVS Motor variants with Gujarat ex-showroom prices.
import datetime, json, os, re, sys

raw, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
data = json.load(open(os.path.join(raw, "models.json")))
SCOOTERS = ("JUPITER", "NTORQ", "ZEST", "SCOOTY", "IQUBE", "ORBITER")
merged = {}
for m in data["models"]:
    name = re.sub(r"(?i)^(tvs|new)\s+", "", m["vehicle"].strip()).strip()
    key = re.sub(r"[^a-z0-9]", "", name.lower())
    e = merged.setdefault(key, {"name": name, "path": m["path"], "variants": {}})
    for p in m["prices"]:
        if str(p.get("Price", "")).isdigit():
            e["variants"][(p.get("VariantNameExtension") or p.get("VariantName") or "Standard").strip()] = int(p["Price"])
index = []
for key, e in merged.items():
    if not e["variants"]:
        continue
    name = e["name"].title().replace("Rtr", "RTR").replace("Rr", "RR").replace(" 4V", " 4V").replace("Xl", "XL")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    variants = [{"name": f"{name} {vn.title()}", "fuel": "Petrol", "transmission": None, "ex_showroom_surat": {"standard": p},
                 "specifications": {}, "features": {}} for vn, p in sorted(e["variants"].items(), key=lambda x: x[1])]
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    doc = {"brand": "TVS", "model": name, "slug": slug, "official_page": "https://www.tvsmotor.com" + e["path"], "brochure_pdf": None,
           "price_city": "Gujarat (state ex-showroom price from tvsmotor.com)", "ex_showroom_min": min(prices), "ex_showroom_max": max(prices),
           "fuel_types": ["Petrol"], "transmissions": [], "colours": [], "variants": variants, "notes": [],
           "fetched_on": datetime.date.today().isoformat()}
    json.dump(doc, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": "Scooter" if name.upper().startswith(SCOOTERS) else "Motorcycle",
                  "variants": len(variants), "colours": 0, "ex_showroom_min": min(prices), "ex_showroom_max": max(prices),
                  "fuel_types": ["Petrol"], "transmissions": [], "brochure_pdf": None})
index.sort(key=lambda m: (m["channel"], m["ex_showroom_min"]))
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
print(len(index), "models,", sum(m["variants"] for m in index), "variants")
