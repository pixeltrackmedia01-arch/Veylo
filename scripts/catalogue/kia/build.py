# build.py RAW_DIR OUT_DIR : normalises Kia India configurator data (Surat prices by paint type,
# colours, engines, gearboxes). Kia publishes no per-variant spec sheet or feature list in a
# machine-readable form (specs page and brochures are graphic layouts), so those are gaps.
import datetime, json, os, re, sys

raw, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
# feed model name: (slug, display name, body type)
MODELS = {
    "SONET": ("sonet", "Sonet", "Compact SUV"), "SYROS": ("syros", "Syros", "Compact SUV"),
    "SYROS_EV": ("syros-ev", "Syros EV", "Electric SUV"), "NEW_SELTOS": ("seltos", "Seltos", "SUV"),
    "CARENS": ("carens", "Carens", "MUV"), "CLAVIS": ("carens-clavis", "Carens Clavis", "MUV"),
    "CLAVIS_EV": ("carens-clavis-ev", "Carens Clavis EV", "Electric MUV"), "SORENTO": ("sorento", "Sorento", "SUV"),
    "CARNIVAL": ("carnival", "Carnival", "MPV"), "EV6": ("ev6", "EV6", "Electric SUV"),
}
PAINT = {"M": "metallic", "N": "non_metallic"}
GEARBOX = [("7DCT", "DCT"), ("DCT", "DCT"), ("IVT", "IVT"), ("CVT", "CVT"), ("IMT", "iMT"), ("6AT", "AT"), ("8AT", "AT"),
           ("AT", "AT"), ("6MT", "MT"), ("5MT", "MT"), ("MT", "MT")]
brochures = json.load(open(os.path.join(raw, "brochures.json")))
files = {json.load(open(os.path.join(raw, f)))["name"]: os.path.join(raw, f) for f in os.listdir(raw) if f.startswith("MDBT")}


def gearbox(name):
    toks = name.upper().split()
    for key, label in GEARBOX:
        if any(t == key or t.endswith(key) for t in toks):
            return label
    return "Automatic" if " EV" in name.upper() else None


def fuel(name, engines):
    n = name.upper()
    if " EV" in n or (engines and all(e.get("fuelType") == "Electric" for e in engines)):
        return "Electric"
    if re.search(r"\bD\d\.\d|CRDI|DIESEL", n):
        return "Diesel"
    if "HEV" in n or "HYBRID" in n:
        return "Hybrid"
    return "Petrol"


index = []
for key, (slug, name, body) in MODELS.items():
    d = json.load(open(files[key]))
    engines = d.get("engines") or []
    variants = []
    for v in d.get("variants", []):
        prices = {PAINT.get(k, k): int(p["intraExsrPrice"]) for k, p in (v.get("price") or {}).items() if p.get("intraExsrPrice")}
        if not prices:
            continue
        vname = re.sub(r"^KIA\s+", "", v["variantName"]).title().replace("Crdi", "CRDi").replace("Vgt", "VGT").replace("Gdi", "GDi")
        variants.append({"code": v["variantCode"], "name": vname, "trim": v.get("variantGroup"),
                         "fuel": fuel(v["variantName"], engines), "transmission": gearbox(v["variantName"]) or ("Automatic" if fuel(v["variantName"], engines) == "Electric" else None),
                         "ex_showroom_surat": prices, "specifications": {}, "features": {}})
    variants.sort(key=lambda x: min(x["ex_showroom_surat"].values()))
    colours = [{"name": c["colorName"], "paint": PAINT.get(c.get("colorGroup"), c.get("colorGroup"))}
               for c in (d.get("colors") or {}).get("exterior", [])]
    allp = [p for v in variants for p in v["ex_showroom_surat"].values()]
    data = {"brand": "Kia", "model": name, "slug": slug, "model_code": d["code"],
            "official_page": f"https://www.kia.com/in/our-vehicles/{slug}/showroom.html", "brochure_pdf": brochures.get(key),
            "price_city": "Surat, Gujarat", "ex_showroom_min": min(allp), "ex_showroom_max": max(allp),
            "fuel_types": sorted({v["fuel"] for v in variants}), "transmissions": sorted({v["transmission"] for v in variants if v["transmission"]}),
            "colours": colours, "engines": [{"name": e.get("introTitle") or e.get("engineName"), "fuel": e.get("fuelType")} for e in engines],
            "variants": variants, "notes": [], "fetched_on": datetime.date.today().isoformat()}
    json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": body, "variants": len(variants), "colours": len(colours),
                  "ex_showroom_min": min(allp), "ex_showroom_max": max(allp), "fuel_types": data["fuel_types"],
                  "transmissions": data["transmissions"], "brochure_pdf": data["brochure_pdf"]})
    print(f"{name:<17} {len(variants):>3} variants {len(colours):>2} colours {min(allp)/1e5:6.2f}-{max(allp)/1e5:6.2f} lakh  {','.join(data['fuel_types'])} | {','.join(data['transmissions'])}")
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
