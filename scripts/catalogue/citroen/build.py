# build.py RAW_DIR OUT_DIR : Citroën India variants with ex-showroom prices and brochure links.
import datetime, json, os, re, sys

raw, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
index = []
for m in json.load(open(os.path.join(raw, "models.json"))):
    if not m.get("status") or not m["prices"]:
        continue
    name = m["displayName"].replace("Citroën ", "").replace("Citroen ", "")
    ev = name.startswith(("ë", "e-", "E-")) or "electric" in name.lower()
    slug = ("e-" if ev else "") + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    diesel_at = "c5 aircross" in name.lower()  # sold in India as a diesel automatic only
    variants = []
    for p in sorted(m["prices"], key=lambda p: p["price"]):
        u = p["variantName"].upper()
        gear = "Automatic" if ev or diesel_at or re.search(r"\bAT\b|\bDCT\b|AUTOMATIC", u) else "MT"
        fuel = "Electric" if ev else ("Diesel" if diesel_at else ("CNG" if "CNG" in u else "Petrol"))
        variants.append({"name": f"{name} {p['variantName']}", "fuel": fuel, "transmission": gear,
                         "ex_showroom_surat": {"standard": int(p["price"])}, "specifications": {}, "features": {}})
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    data = {"brand": "Citroën", "model": name, "slug": slug, "official_page": "https://www.citroen.in/",
            "brochure_pdf": m.get("brochure"), "price_city": "Surat, Gujarat (Citroën publishes one national ex-showroom price list)",
            "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": sorted({v["fuel"] for v in variants}),
            "transmissions": sorted({v["transmission"] for v in variants}), "colours": [], "variants": variants,
            "notes": [], "fetched_on": datetime.date.today().isoformat()}
    json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": m.get("bodyType") or "Car", "variants": len(variants), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": data["fuel_types"],
                  "transmissions": data["transmissions"], "brochure_pdf": data["brochure_pdf"]})
    print(f"{name:<14} {len(variants):>2} variants {min(prices)/1e5:6.2f}-{max(prices)/1e5:6.2f} lakh {','.join(data['fuel_types'])} | {','.join(data['transmissions'])}")
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
