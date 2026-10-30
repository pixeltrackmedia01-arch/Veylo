# build.py RAW_DIR OUT_DIR : Royal Enfield motorcycles with their starting ex-showroom price as
# shown on royalenfield.com (the site's default location is Chennai).
import datetime, json, os, re, sys

raw, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
index = []
for m in json.load(open(os.path.join(raw, "models.json")))["data"]:
    price = re.sub(r"\D", "", m.get("motorcycleExShowroomPrice") or "")
    if not price:
        continue
    name = m["motorcycleName"].strip()
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    style = m.get("motorcycleCategory", "").split("/")[-1].replace("-", " ").title()
    variants = [{"code": m.get("motorcycleFamilyCode"), "name": f"{name} (starting price)", "fuel": "Petrol", "transmission": "MT",
                 "ex_showroom_surat": {"standard": int(price)}, "specifications": {}, "features": {}}]
    doc = {"brand": "Royal Enfield", "model": name, "slug": slug, "official_page": "https://www.royalenfield.com" + m.get("configureMotorcyclePagePath", "/in/en/"),
           "brochure_pdf": None, "price_city": "Royal Enfield website default (ex-showroom Chennai); starting price per model",
           "ex_showroom_min": int(price), "ex_showroom_max": int(price), "fuel_types": ["Petrol"], "transmissions": ["MT"],
           "colours": [], "variants": variants, "notes": ["Starting price only; Royal Enfield prices each colour/variant separately by city."],
           "fetched_on": datetime.date.today().isoformat()}
    json.dump(doc, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": f"Motorcycle ({style})", "variants": 1, "colours": 0, "ex_showroom_min": int(price),
                  "ex_showroom_max": int(price), "fuel_types": ["Petrol"], "transmissions": ["MT"], "brochure_pdf": None})
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
print(len(index), "models")
