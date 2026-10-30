# build.py PRICE_LIST_HTML OUT_DIR : Nissan India variants with ex-showroom prices from the
# tables on nissan.in/prices-list.html (one national price list).
import datetime, json, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import html_tables  # noqa: E402

page, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
MODELS = {"MAGNITE": ("magnite", "Magnite", "Compact SUV"), "GRAVITE": ("gravite", "Gravite", "MUV"), "TEKTON": ("tekton", "Tekton", "SUV")}
found = {k: [] for k in MODELS}
for t in html_tables.tables(page):
    if not t["rows"] or "Ex-Showroom" not in " ".join(t["rows"][0]):
        continue
    for row in t["rows"][1:]:
        if len(row) < 2 or not re.sub(r"\D", "", row[1]):
            continue
        key = next((k for k in MODELS if k in row[0].upper()), None)
        if key:
            found[key].append((row[0], int(re.sub(r"\D", "", row[1]))))
index = []
for key, (slug, name, body) in MODELS.items():
    variants = []
    for label, price in sorted(found[key], key=lambda x: x[1]):
        trim = re.sub(rf"(?i)^(new\s+)?nissan\s+{name}\s*", "", label).strip()
        u = label.upper()
        gear = "CVT" if "CVT" in u else ("DCT" if "DCT" in u else ("AMT" if "EZ" in u and "SHIFT" in u else "MT"))
        variants.append({"name": f"{name} {trim.title()}".replace("Ez-Shift", "EZ-Shift").replace("Cvt", "CVT").replace("Mt", "MT"),
                         "fuel": "Petrol", "transmission": gear, "ex_showroom_surat": {"standard": price},
                         "specifications": {}, "features": {}})
    if not variants:
        continue
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    data = {"brand": "Nissan", "model": name, "slug": slug, "official_page": f"https://www.nissan.in/vehicles/new/nissan-{slug}.html",
            "brochure_pdf": None, "price_city": "Surat, Gujarat (Nissan publishes one national ex-showroom price list)",
            "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": ["Petrol"],
            "transmissions": sorted({v["transmission"] for v in variants}), "colours": [], "variants": variants,
            "notes": ["A factory-approved CNG kit is offered as a priced add-on (see nissan.in/prices-list.html)."] if slug != "tekton" else [],
            "fetched_on": datetime.date.today().isoformat()}
    json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": body, "variants": len(variants), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": ["Petrol"],
                  "transmissions": data["transmissions"], "brochure_pdf": None})
    print(f"{name:<8} {len(variants):>2} variants {min(prices)/1e5:6.2f}-{max(prices)/1e5:6.2f} lakh {','.join(data['transmissions'])}")
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
