"""Build supabase/catalogue/sources/jeep/ from the configurator price feed (fetch-prices.mjs output)."""
import json, os, re, sys
from datetime import date

src = json.load(open(sys.argv[1]))
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "supabase", "catalogue", "sources", "jeep")
MODELS = {  # feed name -> (site model, slug, official page, engine line from the official model page)
    "NEW COMPASS": ("Compass", "compass", "https://www.jeep-india.com/new-compass.html", "2.0 l turbo diesel"),
    "MERIDIAN": ("Meridian", "meridian", "https://www.jeep-india.com/new-jeep-meridian.html", "2.0 l Multijet II diesel"),
    "Wrangler": ("Wrangler", "wrangler", "https://www.jeep-india.com/wrangler-jl.html", None),
    "Grand Cherokee.": ("Grand Cherokee", "grand-cherokee", "https://www.jeep-india.com/new-grand-cherokee.html", None),
}
os.makedirs(OUT, exist_ok=True)
index = []
for feed, variants in src["variants"].items():
    model, slug, page, engine = MODELS[feed]
    out, colours = [], {}
    for v in variants:
        name = re.sub(r"\s+", " ", v["version_name"]).strip()
        specs = {}
        if v.get("num_of_seats"):
            specs["Seating"] = str(v["num_of_seats"])
        if v.get("drive"):
            specs["Drive"] = v["drive"]
        if engine:
            specs["Engine type"] = engine
        for c in v.get("color") or []:
            colours.setdefault(c["color_name"], {"name": c["color_name"]})
        out.append({"name": name, "fuel": v.get("fuel_type") or "Diesel",
                    "transmission": "AT" if (v.get("transmission_type") or "").lower().startswith("auto") else "MT",
                    "ex_showroom_surat": {"standard": int(v["price"])}, "specifications": {"Variant": specs}, "features": {}})
    prices = [x["ex_showroom_surat"]["standard"] for x in out]
    m = {"brand": "Jeep", "model": model, "slug": slug, "channel": "SUV", "official_page": page, "brochure_pdf": None,
         "price_city": "National ex-showroom price (Jeep India configurator)", "ex_showroom_min": min(prices),
         "ex_showroom_max": max(prices), "fuel_types": sorted({x["fuel"] for x in out}),
         "transmissions": sorted({x["transmission"] for x in out}), "colours": list(colours.values()),
         "variants": out, "notes": [], "fetched_on": str(date.today())}
    json.dump(m, open(os.path.join(OUT, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": model, "slug": slug, "channel": "SUV", "variants": len(out),
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices)})
json.dump(index, open(os.path.join(OUT, "index.json"), "w"), indent=2)
print({i["slug"]: i["variants"] for i in index})
