# build.py PAGES_DIR OUT_DIR : Volkswagen India variants with ex-showroom prices from each model's
# price table (one national price list), plus brochure links.
import datetime, html, json, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import html_tables  # noqa: E402

src, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
MODELS = {"virtus": ("Virtus", "Sedan"), "taigun": ("Taigun", "SUV"), "tayron": ("Tayron", "SUV"), "golf-gti": ("Golf GTI", "Hatchback")}
index = []
for slug, (name, body) in MODELS.items():
    path = os.path.join(src, f"{slug}-price.html")
    seen, variants = set(), []
    if not os.path.exists(path):
        # No price table (Tayron, Golf GTI): the model page states "<variant> | price starting ₹ …"
        text = re.sub(r"(?is)<(script|style|svg)[^>]*>.*?</\1>", " ", open(os.path.join(src, f"{slug}.html"), encoding="utf-8", errors="replace").read())
        lines = [l for l in (re.sub(r"\s+", " ", x).strip() for x in html.unescape(re.sub(r"<[^>]+>", "\n", text)).split("\n")) if l]
        for i, l in enumerate(lines):
            m = re.search(r"₹ ?(\d{1,2} \d{2} \d{3})", l)
            if m:
                label = lines[i - 1] if i and not re.search(r"(?i)price|variants", lines[i - 1]) else name
                if label not in seen:
                    seen.add(label)
                    variants.append({"name": label if label.startswith(name.split()[0]) else f"{name} {label}", "fuel": "Petrol",
                                     "transmission": "DSG", "ex_showroom_surat": {"standard": int(m.group(1).replace(" ", ""))},
                                     "specifications": {}, "features": {}})
    for t in (html_tables.tables(path) if os.path.exists(path) else []):
        if not t["rows"] or "Ex-Showroom" not in " ".join(t["rows"][0]):
            continue
        for row in t["rows"][1:]:
            digits = re.sub(r"\D", "", row[1]) if len(row) > 1 else ""
            if not digits or row[0] in seen:
                continue
            seen.add(row[0])
            u = row[0].upper()
            gear = "DSG" if "DSG" in u else ("AT" if re.search(r"\bAT\b", u) else "MT")
            variants.append({"name": f"{name} {row[0]}", "fuel": "Petrol", "transmission": gear,
                             "ex_showroom_surat": {"standard": int(digits)}, "specifications": {}, "features": {}})
    if not variants:
        print("no prices:", name)
        continue
    variants.sort(key=lambda v: v["ex_showroom_surat"]["standard"])
    page = open(os.path.join(src, f"{slug}.html"), encoding="utf-8", errors="replace").read()
    b = re.search(r'href="([^"]+brochure[^"]*\.pdf)"', page)
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    data = {"brand": "Volkswagen", "model": name, "slug": slug, "official_page": f"https://www.volkswagen.co.in/en/models/{slug}.html",
            "brochure_pdf": ("https://www.volkswagen.co.in" + b.group(1)) if b and b.group(1).startswith("/") else (b.group(1) if b else None),
            "price_city": "Surat, Gujarat (Volkswagen publishes one national ex-showroom price list)",
            "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": ["Petrol"],
            "transmissions": sorted({v["transmission"] for v in variants}), "colours": [], "variants": variants,
            "notes": [], "fetched_on": datetime.date.today().isoformat()}
    json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": body, "variants": len(variants), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": ["Petrol"],
                  "transmissions": data["transmissions"], "brochure_pdf": data["brochure_pdf"]})
    print(f"{name:<9} {len(variants):>2} variants {min(prices)/1e5:6.2f}-{max(prices)/1e5:6.2f} lakh {','.join(data['transmissions'])} brochure={'yes' if data['brochure_pdf'] else 'no'}")
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
