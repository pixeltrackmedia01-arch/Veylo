# build.py RAW_DIR OUT_DIR : Honda Motorcycle & Scooter India variants with Gujarat ex-showroom
# prices. Listings repeated with a trailing "." (newer entries of the same model) are merged;
# variants without a Gujarat price are left out and listed in the notes.
import datetime, json, os, re, sys

raw, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
data = json.load(open(os.path.join(raw, "models.json")))
TYPE = {"Motorcycles": "Motorcycle", "Bigwing Motorcycles": "Motorcycle (BigWing)", "Scooter": "Scooter", "Electric Vehicle": "Electric scooter"}
merged = {}
for m in data["models"]:
    name = re.sub(r"\.$", "", str(m["model"]).strip())
    key = re.sub(r"[^a-z0-9]", "", name.lower())
    entry = merged.setdefault(key, {"name": name, "category": m["category"], "variants": {}, "unpriced": set()})
    for v in m["variants"]:
        if v["price"]:
            entry["variants"][v["variant"].strip()] = v["price"]  # later listing wins
            entry["unpriced"].discard(v["variant"].strip())
        elif v["variant"].strip() not in entry["variants"]:
            entry["unpriced"].add(v["variant"].strip())
index, skipped = [], []
for key, e in merged.items():
    if not e["variants"]:
        skipped.append(e["name"])
        continue
    name = e["name"].title().replace("Cb", "CB").replace("Sp", "SP").replace("Adv", "ADV").replace("Nx", "NX").replace("Xl", "XL").replace("Qc", "QC").replace("'Ness", "'Ness")
    slug = re.sub(r"[^a-z0-9]+", "-", e["name"].lower()).strip("-")
    ev = e["category"] == "Electric Vehicle"
    variants = [{"name": vn, "fuel": "Electric" if ev else "Petrol", "transmission": None,
                 "ex_showroom_surat": {"standard": int(p)}, "specifications": {}, "features": {}}
                for vn, p in sorted(e["variants"].items(), key=lambda x: x[1])]
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    doc = {"brand": "Honda (two-wheelers)", "model": name, "slug": slug, "official_page": "https://www.honda2wheelersindia.com/",
           "brochure_pdf": None, "price_city": "Gujarat (state ex-showroom price from honda2wheelersindia.com)",
           "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": [variants[0]["fuel"]], "transmissions": [],
           "colours": [], "variants": variants,
           "notes": [f"No Gujarat price for: {', '.join(sorted(e['unpriced']))}"] if e["unpriced"] else [],
           "fetched_on": datetime.date.today().isoformat()}
    json.dump(doc, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": TYPE.get(e["category"], e["category"]), "variants": len(variants), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": doc["fuel_types"], "transmissions": [], "brochure_pdf": None})
index.sort(key=lambda m: (m["channel"], m["ex_showroom_min"]))
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
print(len(index), "models,", sum(m["variants"] for m in index), "variants; no Gujarat price:", ", ".join(skipped))
