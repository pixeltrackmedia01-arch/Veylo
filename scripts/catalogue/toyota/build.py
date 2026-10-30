# build.py RAW_DIR PAGES_DIR OUT_DIR
# Toyota India: every variant with its Surat dealer ex-showroom price (webapi.toyotabharat.com),
# plus the feature/spec tables that the model pages publish in HTML, kept as published
# ("official_tables"). Toyota's brochures are image flipbooks, so nothing is read from them.
import datetime, json, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import html_tables  # noqa: E402

raw, pages, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
SITE = "https://www.toyotabharat.com/showroom/"
# price model id: (slug, page path, body type, brochure)
MODELS = {
    "20": ("glanza", "glanza/", "Hatchback", None),
    "33": ("urban-cruiser-taisor", "urbancruiser-taisor/", "Compact SUV", "documents/brochures/urban-cruiser-taisor/e-brochure-uc-taisor.pdf"),
    "31": ("rumion", "rumion/", "MUV", None),
    "27": ("urban-cruiser-hyryder", "urbancruiser-hyryder/", "SUV", "documents/brochures/urbancruiser-hyryder/view-brochure/index.html"),
    "34": ("urban-cruiser-ebella", "urbancruiser-ebella/", "Electric SUV", None),
    "30": ("innova-crysta", "innova-crysta/", "MUV", None),
    "28": ("innova-hycross", "innova/", "MUV", "documents/brochures/innova-hycross/view-brochure/index.html"),
    "9": ("fortuner", "fortuner/index-fortuner.html", "SUV", "documents/brochures/fortuner-mmc/gr_mobile-brochure_360x640pix.pdf"),
    "25": ("fortuner-legender", "fortuner/index-legender.html", "SUV", "documents/brochures/fortuner-mmc/legender-brochure-mobile.pdf"),
    "18": ("camry", "camry/", "Sedan", "documents/brochures/camry/view-brochure/index.html"),
    "21": ("vellfire", "vellfire/", "MPV", "documents/brochures/vellfire/view-brochure/index.html"),
    "32": ("land-cruiser-300", "lc300/", "SUV", None),
    "35": ("hilux", "hilux/", "Pickup", None),
}
FUEL = {"P": "Petrol", "D": "Diesel", "H": "Strong Hybrid", "C": "CNG", "E": "Electric"}

models = {m["Id"]: m for m in json.load(open(os.path.join(raw, "models.json")))}
dealer = json.load(open(os.path.join(raw, "dealers.json")))["dealers"][0]
index = []
for mid, (slug, path, body, brochure) in MODELS.items():
    name = models[mid]["Name"]
    rows = json.load(open(os.path.join(raw, f"price-{mid}.json")))
    variants = []
    unpriced = [r["PriceGrade"]["Name"] for r in rows if not int(r["Amount"] or 0)]
    for r in sorted((r for r in rows if int(r["Amount"] or 0)), key=lambda r: int(r["Amount"])):
        g = r["PriceGrade"]
        trans = g.get("Details") or ""
        variants.append({
            "code": g.get("GradeCode"), "name": f"{name} {g['Name']}".strip(),
            "fuel": FUEL.get(g.get("FuelType"), g.get("FuelType")),
            "transmission": "Automatic (e-Drive)" if trans == "e-Drive" else ("Automatic" if trans == "Electric" else trans),
            "ex_showroom_surat": {"standard": int(r["Amount"])},
            "specifications": {}, "features": {},
        })
    tables = []
    page_file = os.path.join(pages, f"{mid}.html")
    if os.path.exists(page_file):
        tables = [t["rows"] for t in html_tables.tables(page_file) if len(t["rows"]) > 1]
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    data = {
        "brand": "Toyota", "model": name, "slug": slug, "official_page": SITE + path,
        "brochure_pdf": f"https://www.toyotabharat.com/{brochure}" if brochure else None,
        "price_city": f"Surat, Gujarat (dealer: {dealer['Name']}; effective {models[mid].get('EffectiveDate')})",
        "ex_showroom_min": min(prices), "ex_showroom_max": max(prices),
        "fuel_types": sorted({v["fuel"] for v in variants}), "transmissions": sorted({v["transmission"] for v in variants}),
        "colours": [], "official_tables": tables, "variants": variants,
        "notes": ([] if tables else ["The model page publishes no feature/spec tables in HTML (brochure is an image flipbook)."])
                 + ([f"Listed without a price at the Surat dealer: {', '.join(unpriced)}"] if unpriced else []),
        "fetched_on": datetime.date.today().isoformat(),
    }
    json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": body, "variants": len(variants), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": data["fuel_types"],
                  "transmissions": data["transmissions"], "brochure_pdf": data["brochure_pdf"]})
    print(f"{name:<24} {len(variants):>3} variants {min(prices)/1e5:6.2f}-{max(prices)/1e5:6.2f} lakh  tables={len(tables)}")
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
