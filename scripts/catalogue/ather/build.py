# build.py PRICE_PAGE_JSON OUT_DIR : Ather Energy variants with Ahmedabad (Gujarat) ex-showroom
# prices (`total`, after offers) and the published on-road price, from atherenergy.com's
# "electric scooter price in Ahmedabad" page data.
import datetime, json, os, re, sys

src, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
rows = json.load(open(src))["pageProps"]["pricingData"]["Ahmedabad"]
FAMILY = [("450APEX", "450 Apex"), ("450X", "450X"), ("450S", "450S"), ("RIZ", "Rizta"), ("KONARC", "Konarc")]
groups = {}
for r in rows:
    fam = next((n for p, n in FAMILY if r["model"].startswith(p)), r["model"])
    trim = ""
    if fam == "Rizta":
        trim = {"Z": " Z", "S": " S"}.get(r["model"][3:4], "")
    battery = " 3.7 kWh" if "35" in r["model"] else ""
    groups.setdefault(fam, []).append((f"Ather {fam}{trim}{battery} ({r['model']}, {r.get('generation', '')})", r))
index = []
for fam, items in groups.items():
    slug = "ather-" + re.sub(r"[^a-z0-9]+", "-", fam.lower()).strip("-")
    seen, variants = set(), []
    for label, r in sorted(items, key=lambda x: x[1]["total"]):
        if r["variant"] in seen or not r.get("total"):
            continue
        seen.add(r["variant"])
        variants.append({"code": r["variant"], "name": label.replace(", )", ")"), "fuel": "Electric", "transmission": "Automatic",
                         "ex_showroom_surat": {"standard": int(r["total"])},
                         "on_road_gujarat": {"insurance": r.get("insurance"), "road_tax": r.get("roadTax"), "total": r.get("onRoadPrice")},
                         "specifications": {}, "features": {}})
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    doc = {"brand": "Ather", "model": f"Ather {fam}", "slug": slug, "official_page": "https://www.atherenergy.com/", "brochure_pdf": None,
           "price_city": "Ahmedabad, Gujarat (atherenergy.com price page; ex-showroom after current offers)",
           "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": ["Electric"], "transmissions": ["Automatic"],
           "colours": [], "variants": variants, "notes": ["Variant names keep Ather's official codes; battery size is shown where the code states it."],
           "fetched_on": datetime.date.today().isoformat()}
    json.dump(doc, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": doc["model"], "slug": slug, "channel": "Electric scooter", "variants": len(variants), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": ["Electric"], "transmissions": ["Automatic"], "brochure_pdf": None})
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
for m in index: print(f"{m['model']:<14} {m['variants']} variants {m['ex_showroom_min']/1e5:5.2f}-{m['ex_showroom_max']/1e5:5.2f} lakh")
