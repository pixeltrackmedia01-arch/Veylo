# build.py RAW_DIR PAGES_DIR OUT_DIR
# Normalises Maruti Suzuki feeds (Surat prices, variants, specs, features, colours)
# into one JSON file per model plus an index.
import json, os, re, sys, datetime

raw, pages, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)

MODELS = [
    # code, slug, name, channel, page file, site base
    ("AT", "alto-k10", "Alto K10", "Arena", "arena-alto-k10", "https://www.marutisuzuki.com/arena/alto-k10"),
    ("SP", "s-presso", "S-Presso", "Arena", "arena-s-presso", "https://www.marutisuzuki.com/arena/s-presso"),
    ("CL", "celerio", "Celerio", "Arena", "arena-celerio", "https://www.marutisuzuki.com/arena/celerio"),
    ("WA", "wagonr", "WagonR", "Arena", "arena-wagon-r", "https://www.marutisuzuki.com/arena/wagon-r"),
    ("SI", "swift", "Swift", "Arena", "arena-swift", "https://www.marutisuzuki.com/arena/swift"),
    ("DE", "dzire", "Dzire", "Arena", "arena-dzire", "https://www.marutisuzuki.com/arena/dzire"),
    ("VR", "eeco", "Eeco", "Arena", "arena-eeco", "https://www.marutisuzuki.com/arena/eeco"),
    ("VZ", "brezza", "Brezza", "Arena", "arena-brezza", "https://www.marutisuzuki.com/arena/brezza"),
    ("ER", "ertiga", "Ertiga", "Arena", "arena-ertiga", "https://www.marutisuzuki.com/arena/ertiga"),
    ("EC", "victoris", "Victoris", "Arena", "arena-victoris", "https://www.marutisuzuki.com/arena/victoris"),
    ("BZ", "baleno", "Baleno", "Nexa", "nexa-baleno", "https://www.nexaexperience.com/baleno"),
    ("FR", "fronx", "Fronx", "Nexa", "nexa-fronx", "https://www.nexaexperience.com/fronx"),
    ("GV", "grand-vitara", "Grand Vitara", "Nexa", "nexa-grand-vitara", "https://www.nexaexperience.com/grand-vitara"),
    ("IN", "invicto", "Invicto", "Nexa", "nexa-invicto", "https://www.nexaexperience.com/invicto"),
    ("JM", "jimny", "Jimny", "Nexa", "nexa-jimny", "https://www.nexaexperience.com/jimny"),
    ("XL", "xl6", "XL6", "Nexa", "nexa-xl6", "https://www.nexaexperience.com/xl6"),
    ("VE", "e-vitara", "e Vitara", "Nexa", "nexa-e-vitara", "https://www.nexaexperience.com/e-vitara"),
]
PAINT = {"M": "metallic", "NM": "non_metallic", "D": "dual_tone"}
SKIP = {"_model", "categoryLabel", "categoryName", "_path"}


def load(name):
    with open(os.path.join(raw, name)) as f:
        return json.load(f)


def absolute(url, base):
    if not url:
        return None
    if url.startswith("http"):
        return url
    host = re.match(r"https://[^/]+", base).group(0)
    return host + url


def brochure(page, base):
    try:
        html = open(os.path.join(pages, page + ".html"), encoding="utf-8", errors="replace").read()
    except FileNotFoundError:
        return None
    links = re.findall(r'(?:href|data-[a-z-]+)="([^"]+\.pdf)"', html, re.I)
    links = [l for l in links if "brochure" in l.lower()] or links
    return absolute(links[0], base) if links else None


def aspects(variant, wanted):
    """Yield (category label, {field: value}) for a specificationCategory group."""
    for cat in variant.get("specificationCategory") or []:
        name = (cat.get("categoryName") or "").lower()
        if wanted not in name:
            continue
        for a in cat.get("specificationAspect") or []:
            yield a.get("categoryLabel") or "Other", {k: v for k, v in a.items() if k not in SKIP}


def build(code, slug, name, channel, page, base):
    compare = load(f"{code}-compare.json")["data"]
    labels = (compare.get("variantSpecificationsLabelsList", {}).get("items") or [{}])[0]
    label = lambda k: labels.get(f"{k}_label") or re.sub(r"(?<!^)([A-Z])", r" \1", k).capitalize()
    cmodel = compare["carModelList"]["items"][0]
    feats = {v["variantCd"]: v for v in load(f"{code}-features.json")["data"]["carModelList"]["items"][0]["variants"]}
    price = load(f"{code}-price.json")["data"]["models"][0]
    rows = price["exShowroomDetailResponseDTOList"]

    variants, colours = [], {}
    for v in cmodel["variants"]:
        vc = v["variantCd"]
        prices = {}
        for r in rows:
            if r["variantCd"] == vc:
                prices[PAINT.get(r["colorType"], r["colorType"])] = r["exShowroomPrice"]
        specs = {}
        for cat, fields in aspects(v, "technical"):
            for k, val in fields.items():
                if val not in (None, "", "No", "-"):
                    specs.setdefault(cat, {})[label(k)] = val
        features = {}
        for cat, fields in aspects(v, "feature"):
            for k, val in fields.items():
                if val in (None, "", "No", "-", "NA"):
                    continue
                features.setdefault(cat, []).append(label(k) if val == "Yes" else f"{label(k)}: {val}")
        fv = feats.get(vc, {})
        for c in fv.get("colors") or []:
            colours.setdefault(c["eColorDesc"], {"name": c["eColorDesc"], "hex": c.get("hexCode"), "paint": PAINT.get(c.get("colorType"), c.get("colorType")), "variants": []})["variants"].append(v["variantName"])
        img = (v.get("variantImage") or {})
        fuel = fv.get("fuelType") or specs.get("Fuel", {}).get(label("fuelType"))
        if "Strong Hybrid" in (v.get("variantTechnology") or []):
            fuel = "Strong Hybrid"
        variants.append({
            "code": vc,
            "name": v["variantName"],
            "fuel": fuel,
            "transmission": v.get("transmission"),
            "technology": v.get("variantTechnology") or [],
            "airbags": int(fv["airbags"]) if fv.get("airbags") else None,
            "ex_showroom_surat": prices,
            "specifications": specs,
            "features": features,
            "reference_image": absolute(img.get("_publishUrl"), base),
        })
    variants.sort(key=lambda x: min(x["ex_showroom_surat"].values()) if x["ex_showroom_surat"] else 10**9)
    current = [p for v in variants for p in v["ex_showroom_surat"].values()]
    return {
        "brand": "Maruti Suzuki",
        "model": name,
        "slug": slug,
        "model_code": code,
        "channel": channel,
        "official_page": base,
        "brochure_pdf": brochure(page, base),
        "price_city": "Surat, Gujarat",
        "ex_showroom_min": min(current) if current else None,
        "ex_showroom_max": max(current) if current else None,
        "fuel_types": sorted({v["fuel"] for v in variants if v["fuel"]}),
        "transmissions": sorted({v["transmission"] for v in variants if v["transmission"]}),
        "colours": list(colours.values()),
        "variants": variants,
    }


index = []
for m in MODELS:
    data = build(*m)
    data["fetched_on"] = datetime.date.today().isoformat()
    with open(os.path.join(out, f"{data['slug']}.json"), "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    index.append({k: data[k] for k in ("model", "slug", "channel", "ex_showroom_min", "ex_showroom_max", "fuel_types", "transmissions", "brochure_pdf")} | {"variants": len(data["variants"]), "colours": len(data["colours"])})
with open(os.path.join(out, "index.json"), "w") as f:
    json.dump(index, f, indent=2, ensure_ascii=False)
for i in index:
    print(f"{i['model']:<14} {i['channel']:<6} {i['variants']:>3} variants {i['colours']:>3} colours  {i['ex_showroom_min']:>9} - {i['ex_showroom_max']:>9}  {','.join(i['fuel_types'])}  brochure={'yes' if i['brochure_pdf'] else 'NO'}")
