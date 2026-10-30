# build.py XLSX_DIR OUT_DIR : Renault India variants with official Surat ex-showroom prices,
# read from Renault's city-wise price sheets (row: City == Surat; one column per version).
import datetime, glob, json, os, re, sys
import openpyxl

src, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
BODY = {"kwid": "Hatchback", "triber": "MUV", "kiger": "Compact SUV", "duster": "SUV"}
index = []
for path in sorted(glob.glob(os.path.join(src, "*.xlsx"))):
    ws = openpyxl.load_workbook(path, data_only=True)["Prices"]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    head_i = next(i for i, r in enumerate(rows) if any(str(c or "").strip().startswith("Version Price Type") for c in r))
    head = [str(c or "").strip() for c in rows[head_i]]
    city_col = head.index("City")
    surat = next(r for r in rows[head_i + 1:] if str(r[city_col] or "").strip().lower() == "surat")
    model = re.search(r"en_([A-Za-z]+)", os.path.basename(path)).group(1)
    name, slug = model.title(), model.lower()
    variants = {}
    for col, label in enumerate(head):
        if col <= city_col or not label or not isinstance(surat[col], (int, float)) or not surat[col] or "cities" in label.lower():
            continue
        label = re.sub(r"\s+", " ", label).strip(" .")
        label = re.sub(rf"^{name}\s+", "", label, flags=re.I)  # Duster sheet repeats the model name
        dual = bool(re.search(r"dual ?tone", label, re.I))
        base = re.sub(r"\s*dual ?tone\.?", "", label, flags=re.I).strip()
        u = base.upper()
        fuel = "Strong Hybrid" if "HYBRID" in u or "E-TECH" in u else ("CNG" if "CNG" in u else "Petrol")
        gear = next((g for g in ("AMT", "CVT", "DCT", "EDC", "MT", "AT") if re.search(rf"\b{g}\b", u)), "Automatic" if fuel == "Strong Hybrid" else "MT")  # no gearbox in the name = manual
        v = variants.setdefault(base, {"name": f"{name} {base}", "fuel": fuel, "transmission": gear,
                                       "ex_showroom_surat": {}, "specifications": {}, "features": {}})
        v["ex_showroom_surat"]["dual_tone" if dual else "standard"] = int(surat[col])
    vs = sorted(variants.values(), key=lambda v: min(v["ex_showroom_surat"].values()))
    prices = [p for v in vs for p in v["ex_showroom_surat"].values()]
    date = re.search(r"(\d{8})", path).group(1)
    data = {"brand": "Renault", "model": name, "slug": slug, "official_page": f"https://www.renault.co.in/cars/renault-{slug}.html",
            "brochure_pdf": None, "price_city": f"Surat, Gujarat (Renault price sheet dated {date[:2]}-{date[2:4]}-{date[4:]})",
            "ex_showroom_min": min(prices), "ex_showroom_max": max(prices),
            "fuel_types": sorted({v["fuel"] for v in vs}), "transmissions": sorted({v["transmission"] for v in vs if v["transmission"]}),
            "colours": [], "variants": vs, "notes": [], "fetched_on": datetime.date.today().isoformat()}
    json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    index.append({"model": name, "slug": slug, "channel": BODY.get(slug, "Car"), "variants": len(vs), "colours": 0,
                  "ex_showroom_min": min(prices), "ex_showroom_max": max(prices), "fuel_types": data["fuel_types"],
                  "transmissions": data["transmissions"], "brochure_pdf": None})
    print(f"{name:<8} {len(vs):>2} variants {min(prices)/1e5:6.2f}-{max(prices)/1e5:6.2f} lakh {','.join(data['fuel_types'])} | {','.join(data['transmissions'])}")
index.sort(key=lambda m: m["ex_showroom_min"])
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
