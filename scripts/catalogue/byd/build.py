# build.py PAGE_JSON OUT_DIR : BYD India variants with ex-showroom prices, read from the model
# pages served by api.bydautoindia.com/page (prices are printed in each page's variant table;
# one national ex-showroom price).
import datetime, html, json, os, re, sys

src, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
MODELS = {"bydatto3": ("atto-3", "Atto 3", "Electric SUV"), "bydemax7": ("emax-7", "eMAX 7", "Electric MPV"),
          "bydseal": ("seal", "Seal", "Electric Sedan"), "bydsealion7": ("sealion-7", "Sealion 7", "Electric SUV")}
pages = {p.get("sku"): p for p in json.load(open(src))["data"]}
index = []
for sku, (slug, name, body) in MODELS.items():
    if sku not in pages:
        continue
    b = html.unescape(re.sub(r"(?is)<!--.*?-->", "", pages[sku]["body"]))
    lines = [l for l in (re.sub(r"\s+", " ", x.replace("\\n", " ")).strip() for x in re.sub(r"<[^>]+>", "\n", b).split("\n")) if l]
    variants, counts = [], {}
    for i, l in enumerate(lines):
        if re.fullmatch(r"(?:₹|INR)\s?\d[\d ,]{5,}\*?(?:/-)?", l):
            label = next((x for x in reversed(lines[max(0, i - 3):i]) if re.search(r"[A-Za-z]", x)), "")
            trim = label.title().replace("(With Rich Tan & Black Interiors)", "(Rich Tan & Black interior)")
            counts[trim] = counts.get(trim, 0) + 1
            variants.append({"name": f"{name} {trim}", "trim": trim, "fuel": "Electric", "transmission": "Automatic",
                             "ex_showroom_surat": {"standard": int(re.sub(r"\D", "", l))}, "specifications": {}, "features": {}})
    for v in variants:  # the same trim listed twice at different prices (e.g. seating/battery options)
        if counts[v["trim"]] > 1:
            k = sum(1 for w in variants[: variants.index(v) + 1] if w["trim"] == v["trim"])
            v["name"] += f" (option {k})"
    if not variants:
        continue
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    data = {"brand": "BYD", "model": name, "slug": slug, "official_page": f"https://www.bydautoindia.com/{sku}",
            "brochure_pdf": None, "price_city": "Surat, Gujarat (BYD lists one all-India ex-showroom price)",
            "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": ["Electric"], "transmissions": ["Automatic"],
            "colours": [], "variants": variants,
            "notes": ["Some trims are listed twice at different prices without saying what differs (likely seating or battery option)."] if any(c > 1 for c in counts.values()) else [],
            "fetched_on": datetime.date.today().isoformat()}
    json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": body, "variants": len(variants), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": ["Electric"],
                  "transmissions": ["Automatic"], "brochure_pdf": None})
    print(f"{name:<10} {len(variants)} variants {min(prices)/1e5:6.2f}-{max(prices)/1e5:6.2f} lakh")
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
