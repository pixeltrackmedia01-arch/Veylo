# build.py RAW_DIR BROCHURE_DIR OUT_DIR
# Normalises Mahindra data: variants, ex-showroom prices and colours from the Product-Variation
# feed, plus the spec lines Mahindra prints as text in its brochures (features are tick icons
# in the brochures and are not machine-readable, so they are not included).
import datetime, json, os, re, sys

raw, brochures, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
BROCHURE = dict(l.split() for l in open(os.path.join(HERE, "brochures.txt")) if l.strip())
A, E = "https://auto.mahindra.com", "https://www.mahindraelectricsuv.com"
# code: (slug, display name, body type, official page)
MODELS = {
    "BOL": ("bolero", "Bolero", "SUV", f"{A}/suv/bolero/BOL.html"),
    "NEO": ("bolero-neo", "Bolero Neo", "SUV", f"{A}/suv/bolero-neo/NEO.html"),
    "NEOP": ("bolero-neo-plus", "Bolero Neo Plus", "SUV", f"{A}/suv/bolero-neo-plus/NEOP.html"),
    "SCRC": ("scorpio-classic", "Scorpio Classic", "SUV", f"{A}/suv/scorpio-classic/SCRC.html"),
    "SCN": ("scorpio-n", "Scorpio-N", "SUV", f"{A}/suv/scorpio-n/SCN.html"),
    "THRN": ("thar", "Thar", "SUV", f"{A}/suv/thar/THRN.html"),
    "TH5D": ("thar-roxx", "Thar Roxx", "SUV", f"{A}/suv/thar-roxx/TH5D.html"),
    "X3XO": ("xuv-3xo", "XUV 3XO", "Compact SUV", f"{A}/suv/xuv3xo/X3XO.html"),
    "X7XO": ("xuv-7xo", "XUV 7XO", "SUV", f"{A}/suv/xuv-7xo.html"),
    "X400": ("xuv400", "XUV400", "Electric SUV", f"{A}/suv/xuv400/X400.html"),
    "MBE6": ("be-6", "BE 6", "Electric SUV", f"{E}/esuv/be-6/MBE6.html"),
    "MXV9": ("xev-9e", "XEV 9e", "Electric SUV", f"{E}/esuv/xev-9e/MXV9.html"),
    "XEV9": ("xev-9s", "XEV 9S", "Electric SUV", f"{E}/esuv/xev-9s/XEV9.html"),
}
SPEC_LINE = re.compile(r"(?i)\b(max(imum)? power|max(imum)? torque|engine capacity|displacement|overall length|length \(mm\)|"
                       r"wheelbase|ground clearance|boot space|fuel tank|battery capacity|certified range|range \(|"
                       r"charging time|transmission type)\b")


def brochure_specs(pid):
    """Spec lines printed as text in the brochure, kept verbatim (label | values)."""
    path = os.path.join(brochures, f"{pid}.txt")
    if not os.path.exists(path):
        return []
    lines = []
    for l in open(path, encoding="utf-8", errors="replace"):
        if SPEC_LINE.search(l) and len(l.strip()) < 220 and re.search(r"\d", l):
            s = re.sub(r"\s{3,}", " | ", l.strip())
            if s not in lines:
                lines.append(s)
    return lines[:30]


def title(s):
    return s.title().replace("Cng", "CNG").replace("Mt", "MT").replace("At", "AT").replace("2Wd", "2WD").replace("4Wd", "4WD")


index = []
for pid, (slug, name, body, page) in MODELS.items():
    d = json.load(open(os.path.join(raw, f"{pid}.json")))
    attrs = {a["attributeId"]: a for a in d["base"]["product"]["variationAttributes"]}
    colours = [{"name": title(v.get("displayValue") or v["id"]), "hex": [v["hexCode"]] if v.get("hexCode") else None}
               for v in (attrs.get("colorCode") or {}).get("values", [])]
    variants = []
    for c in sorted(d["cards"], key=lambda c: c["price"]):
        fuel = c.get("fuelType", "Electric" if body.startswith("Electric") else "")
        spec = {k: c[k] for k in ("seatingCapacity", "gearBoxType", "batteryCapacity", "charger", "variantPack", "driveType") if c.get(k)}
        drive = re.search(r"\b([24]WD|AWD)\b", c["name"])
        variants.append({
            "code": c["code"],
            "name": f"{name} {c['name']}" + (f" {c['batteryCapacity']}" if c.get("batteryCapacity") and c["batteryCapacity"] not in c["name"] else "")
,
            "fuel": "Electric" if not fuel or fuel.upper().startswith("ELECTR") else title(fuel),
            "transmission": title(c["gearBoxType"]) if c.get("gearBoxType") else ("Automatic" if not fuel or fuel.upper() == "ELECTRIC" else None),
            "ex_showroom_surat": {"standard": c["price"]},
            "specifications": {"Variant": {k: v for k, v in {
                "Seating": spec.get("seatingCapacity"), "Drive": drive.group(1) if drive else None,
                "Battery": spec.get("batteryCapacity"), "Home charger": spec.get("charger"), "Pack": spec.get("variantPack"),
            }.items() if v}},
            "features": {},
        })
    prices = [v["ex_showroom_surat"]["standard"] for v in variants]
    data = {
        "brand": "Mahindra", "model": name, "slug": slug, "model_code": pid, "official_page": page,
        "brochure_pdf": BROCHURE.get(pid), "price_city": "Surat, Gujarat (Mahindra lists one ex-showroom price nationally)",
        "ex_showroom_min": min(prices), "ex_showroom_max": max(prices),
        "fuel_types": sorted({v["fuel"] for v in variants}), "transmissions": sorted({v["transmission"] for v in variants if v["transmission"]}),
        "colours": colours, "brochure_specs": brochure_specs(pid), "variants": variants,
        "notes": [] if BROCHURE.get(pid) else ["No brochure on the model page."],
        "fetched_on": datetime.date.today().isoformat(),
    }
    json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": body, "variants": len(variants), "colours": len(colours),
                  "ex_showroom_min": data["ex_showroom_min"], "ex_showroom_max": data["ex_showroom_max"],
                  "fuel_types": data["fuel_types"], "transmissions": data["transmissions"], "brochure_pdf": data["brochure_pdf"]})
    print(f"{name:<16} {len(variants):>3} variants {len(colours):>2} colours {min(prices)/1e5:6.2f}-{max(prices)/1e5:6.2f} lakh  spec-lines={len(data['brochure_specs'])}")
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
