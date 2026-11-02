"""Skoda India: official ex-showroom prices from the Skoda price checker service
(skodapeaceofmind.co.in CheckPrice.aspx/GetPrice, linked from skoda-auto.co.in/aid/checkprice).

usage: python3 -I scripts/catalogue/skoda/fetch.py   -> writes supabase/catalogue/sources/skoda/
Skoda publishes one national ex-showroom price list. Engine figures come from the
schema.org data on each official model page (skoda-auto.co.in/models/<m>/<m>).
"""
import json, os, re, subprocess
from datetime import date

API = "https://skodapeaceofmind.co.in/Skoda_TCD/checkprice/CheckPrice.aspx/GetPrice"
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "supabase", "catalogue", "sources", "skoda")
# site model -> (price-checker name, slug, body channel, official page)
MODELS = [
    ("Kylaq", "Kylaq", "kylaq", "SUV", "https://www.skoda-auto.co.in/models/kylaq/kylaq"),
    ("Kushaq", "Kushaq", "kushaq", "SUV", "https://www.skoda-auto.co.in/models/kushaq/kushaq"),
    ("Slavia", "New Slavia", "slavia", "Sedan", "https://www.skoda-auto.co.in/models/slavia/slavia"),
    ("Kodiaq", "Kodiaq", "kodiaq", "SUV", "https://www.skoda-auto.co.in/models/kodiaq/kodiaq"),
    ("Kodiaq", "Kodiaq RS", "kodiaq", "SUV", "https://www.skoda-auto.co.in/models/kodiaq/kodiaq"),
    ("Octavia RS", "Octavia", "octavia-rs", "Sedan", "https://www.skoda-auto.co.in/models/octavia-rs/octavia-rs"),
]
# From the official model pages (schema.org vehicleEngine / page copy). Displacements are
# those of the same Volkswagen-group TSI engines in Volkswagen India's official brochures.
ENGINES = {
    "1.0 TSI": {"Displacement": "999 cc", "Max power": "85 kW (115 PS)", "Max torque": "178 Nm"},
    "1.5 TSI": {"Displacement": "1498 cc", "Max power": "110 kW (150 PS)"},
    "2.0 TSI": {"Displacement": "1984 cc", "Max power": "150 kW (204 PS)", "Max torque": "320 Nm"},
}
MODEL_SPECS = {"kylaq": {"Boot space": "446 litres"}, "octavia-rs": {"Displacement": "1984 cc", "Max power": "195 kW (265 PS)"}}


def get(model, trans):
    body = json.dumps({"selectedModel": model, "fuelType": "Petrol", "transmissionType": trans})
    out = subprocess.run(["curl", "-s", "-X", "POST", "-H", "Content-Type: application/json; charset=utf-8",
                          "-A", "Mozilla/5.0", "-d", body, API], capture_output=True, check=True).stdout
    return json.loads(out)["d"]


models = {}
for site_model, api_model, slug, channel, page in MODELS:
    m = models.setdefault(slug, {"brand": "Skoda", "model": site_model, "slug": slug, "channel": channel,
                                 "official_page": page, "brochure_pdf": None,
                                 "price_city": "National ex-showroom price (Skoda publishes one all-India price list)",
                                 "variants": [], "notes": [], "fetched_on": str(date.today())})
    for trans in ("Manual", "Automatic"):
        for v in get(api_model, trans):
            name = v["Variant"]
            tr = "DSG" if "DSG" in name else ("AT" if trans == "Automatic" else "MT")
            if not re.search(r"\b(MT|AT|DSG)\b", name):  # Skoda reuses some names for MT and AT
                name = f"{name} {tr}"
            eng = next((k for k in ENGINES if k in name), None)
            specs = {**(ENGINES.get(eng) or {}), **MODEL_SPECS.get(slug, {})}
            if api_model == "Kodiaq RS":
                name, specs = f"RS {name.replace('RS ', '')}", {"Displacement": "1984 cc"}
            m["variants"].append({"name": name, "fuel": "Petrol", "transmission": tr,
                                  "ex_showroom_surat": {"standard": int(v["ExshowroomPrice"].replace(" ", ""))},
                                  "specifications": {"Engine": specs},
                                  "features": {}})

os.makedirs(OUT, exist_ok=True)
index = []
for slug, m in models.items():
    prices = [v["ex_showroom_surat"]["standard"] for v in m["variants"]]
    m.update(ex_showroom_min=min(prices), ex_showroom_max=max(prices), fuel_types=["Petrol"],
             transmissions=sorted({v["transmission"] for v in m["variants"]}), colours=[])
    json.dump(m, open(os.path.join(OUT, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": m["model"], "slug": slug, "channel": m["channel"], "variants": len(m["variants"]),
                  "ex_showroom_min": m["ex_showroom_min"], "ex_showroom_max": m["ex_showroom_max"]})
json.dump(index, open(os.path.join(OUT, "index.json"), "w"), indent=2)
print({k: len(v["variants"]) for k, v in models.items()})
