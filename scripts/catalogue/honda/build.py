# build.py RAW_DIR OUT_DIR : Honda Cars India variants with Surat ex-showroom prices (from
# /api/getCarPrice) and brochure links.
import datetime, glob, json, os, re, sys

raw, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
SLUG = {32: ("city", "City", "Sedan"), 41: ("amaze", "Amaze", "Sedan"), 36: ("amaze-2nd-gen", "Amaze (2nd Gen)", "Sedan"),
        38: ("elevate", "Elevate", "SUV"), 42: ("zr-v", "ZR-V", "SUV")}
cars = {c["carModelId"]: c for c in json.load(open(os.path.join(raw, "cars.json")))}
rows = {}
for f in glob.glob(os.path.join(raw, "prices*.json")):
    for r in json.load(open(f)):
        rows[(r["carId"], r["fuel"], r["transmission"], r["grade"])] = r
index = []
for cid, car in cars.items():
    slug, name, body = SLUG.get(cid, (re.sub(r"[^a-z0-9]+", "-", car["carModelName"].lower()).strip("-"), car["carModelName"], "Car"))
    variants = []
    for r in sorted((r for k, r in rows.items() if k[0] == cid), key=lambda r: r["price"]):
        gear = r["transmission"].split(" ")[0]
        fuel = "Strong Hybrid" if r["fuel"] == "e:HEV" else r["fuel"]
        variants.append({"name": f"{name} {r['grade'] if r['grade'] != 'ZRV' else ''} {gear}".replace("  ", " ").strip()
                         + (" e:HEV" if fuel == "Strong Hybrid" else ""),
                         "trim": r["grade"], "fuel": fuel, "transmission": gear,
                         "ex_showroom_surat": {"standard": r["price"]}, "specifications": {}, "features": {}})
    if not variants:
        print("no prices for", name)
        continue
    b = car.get("brochure")
    brochure = b[0].get("PN_Broucher") if isinstance(b, list) and b else None
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    data = {"brand": "Honda", "model": name, "slug": slug, "official_page": f"https://www.hondacarindia.com/{car['carModelSiteUrl']}",
            "brochure_pdf": brochure.replace(" ", "%20") if brochure else None, "price_city": "Surat, Gujarat",
            "ex_showroom_min": min(prices), "ex_showroom_max": max(prices),
            "fuel_types": sorted({v["fuel"] for v in variants}), "transmissions": sorted({v["transmission"] for v in variants}),
            "colours": [], "variants": variants, "notes": [], "fetched_on": datetime.date.today().isoformat()}
    json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": body, "variants": len(variants), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": data["fuel_types"],
                  "transmissions": data["transmissions"], "brochure_pdf": data["brochure_pdf"]})
    print(f"{name:<16} {len(variants):>2} variants {min(prices)/1e5:6.2f}-{max(prices)/1e5:6.2f} lakh")
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
