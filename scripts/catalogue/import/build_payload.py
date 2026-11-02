# build_payload.py OUT_DIR [MAX_KB]
# Turns supabase/catalogue/sources/<brand>/*.json into compact import payloads for the website
# database (one JSON file per chunk, each under MAX_KB, default 90). Each payload holds brands and
# vehicles in the site's own format: flat specification keys the pages and FAQ generator read
# ("Mileage", "Range", "Max power", "Seating", …), feature lists de-duplicated per model, a written
# summary and highlights built from the data, and the price inputs (stored against the Surat price city).
import glob, json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
SRC = os.path.join(ROOT, "supabase", "catalogue", "sources")
OUT = sys.argv[1]
MAX = int(sys.argv[2]) * 1024 if len(sys.argv) > 2 else 90 * 1024
os.makedirs(OUT, exist_ok=True)

# source folder -> (manufacturer slug, display name, category, website)
BRANDS = {
    "maruti": ("maruti-suzuki", "Maruti Suzuki", "car", "https://www.marutisuzuki.com"),
    "hyundai": ("hyundai", "Hyundai", "car", "https://www.hyundai.com/in"),
    "mahindra": ("mahindra", "Mahindra", "car", "https://auto.mahindra.com"),
    "toyota": ("toyota", "Toyota", "car", "https://www.toyotabharat.com"),
    "kia": ("kia", "Kia", "car", "https://www.kia.com/in"),
    "honda": ("honda-cars", "Honda Cars", "car", "https://www.hondacarindia.com"),
    "mg": ("mg-motor", "MG Motor", "car", "https://www.mgmotor.co.in"),
    "renault": ("renault", "Renault", "car", "https://www.renault.co.in"),
    "nissan": ("nissan", "Nissan", "car", "https://www.nissan.in"),
    "volkswagen": ("volkswagen", "Volkswagen", "car", "https://www.volkswagen.co.in"),
    "skoda": ("skoda", "Skoda", "car", "https://www.skoda-auto.co.in"),
    "jeep": ("jeep", "Jeep", "car", "https://www.jeep-india.com"),
    "citroen": ("citroen", "Citroën", "car", "https://www.citroen.in"),
    "byd": ("byd", "BYD", "car", "https://www.bydautoindia.com"),
    "hero": ("hero", "Hero MotoCorp", "two_wheeler", "https://www.heromotocorp.com"),
    "honda-2w": ("honda-2w", "Honda Motorcycle & Scooter India", "two_wheeler", "https://www.honda2wheelersindia.com"),
    "tvs": ("tvs", "TVS Motor", "two_wheeler", "https://www.tvsmotor.com"),
    "bajaj": ("bajaj", "Bajaj Auto", "two_wheeler", "https://www.bajajauto.com"),
    "royal-enfield": ("royal-enfield", "Royal Enfield", "two_wheeler", "https://www.royalenfield.com"),
    "ola": ("ola-electric", "Ola Electric", "two_wheeler", "https://www.olaelectric.com"),
    "ather": ("ather", "Ather Energy", "two_wheeler", "https://www.atherenergy.com"),
}
BODY = [("pickup", "pickup"), ("mpv", "minivan"), ("van", "minivan"), ("muv", "muv"), ("compact suv", "compact_suv"),
        ("suv", "suv"), ("sedan", "sedan"), ("hatch", "hatchback"), ("scooter", "scooter"), ("motorcycle", "motorcycle"),
        ("coupe", "coupe"), ("convertible", "convertible")]
SWATCH = [("white", "#f4f4f2"), ("silver", "#c3c6c9"), ("grey", "#6b7078"), ("gray", "#6b7078"), ("black", "#16171a"),
          ("red", "#a3161b"), ("maroon", "#5b1a1f"), ("orange", "#d9622b"), ("yellow", "#e2b22c"), ("gold", "#b8913f"),
          ("bronze", "#8a6440"), ("beige", "#cbbd9c"), ("brown", "#5d4130"), ("khaki", "#7f7a5a"), ("green", "#2f5d3a"),
          ("emerald", "#1f5a46"), ("olive", "#5b5f3a"), ("teal", "#1f6f74"), ("blue", "#1f3f7a"), ("sapphire", "#1d3a6e"),
          ("night", "#1c2236"), ("titan", "#5c6066")]


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("ë", "e").replace("+", " plus")).strip("-") or "x"


BODY_BY_SLUG = {  # Maruti's index lists the showroom (Arena/Nexa), not the body type
    "alto-k10": "hatchback", "s-presso": "hatchback", "celerio": "hatchback", "wagonr": "hatchback", "swift": "hatchback",
    "dzire": "sedan", "eeco": "minivan", "brezza": "compact_suv", "ertiga": "muv", "victoris": "suv", "baleno": "hatchback",
    "fronx": "compact_suv", "grand-vitara": "suv", "invicto": "muv", "jimny": "suv", "xl6": "muv", "e-vitara": "suv"}


def body_of(channel, brand_cat, slug=None):
    if slug in BODY_BY_SLUG:
        return BODY_BY_SLUG[slug]
    c = (channel or "").lower()
    for k, v in BODY:
        if k in c:
            return v
    return "scooter" if "scooter" in c else ("motorcycle" if brand_cat == "two_wheeler" else "suv")


def fuel_of(f, brand_cat):
    f = (f or "").lower()
    if "electric" in f:
        return "electric"
    if "hybrid" in f:
        return "hybrid"
    if "diesel" in f:
        return "diesel"
    if "cng" in f:
        return "cng" if brand_cat == "two_wheeler" else "petrol_cng"
    return "petrol"


def trans_of(t, body, fuel):
    t = (t or "").upper()
    if any(k in t for k in ("AMT", "AGS", "EZ", "AUTOSHIFT")):
        return "amt"
    if any(k in t for k in ("CVT", "IVT")):
        return "cvt"
    if any(k in t for k in ("DCT", "DSG")):
        return "dct"
    if t in ("AT", "TC") or "AUTOMATIC" in t or t.endswith("AT") or "E-DRIVE" in t:
        return "automatic"
    if "MT" in t or "MANUAL" in t or "IMT" in t:
        return "manual"
    if fuel == "electric" or body == "scooter":
        return "automatic"
    return "manual" if body == "motorcycle" else "not_applicable"


def flat(specs):
    """Nested {group: {name: value}} -> {name: value}."""
    out = {}
    for g, items in (specs or {}).items():
        if isinstance(items, dict):
            for k, v in items.items():
                out.setdefault(k, v)
        elif isinstance(items, (str, int, float)):
            out.setdefault(g, items)
    return out


CANON = [  # site key, source-name patterns
    ("Engine", r"^(displacement|capacity \(cc\)|engine capacity|capacity$)"),
    ("Battery", r"(battery capacity|capacity \(kwh\)|^battery$)"),
    ("Max power", r"^max(imum)?\.? (power|output)"),
    ("Max torque", r"^max(imum)?\.? torque"),
    ("Mileage", r"(fuel[ -]efficiency|mileage)"),
    ("Range", r"(driving range|^range|certified range)"),
    ("Transmission", r"^transmission( type)?$|^gearbox$"),
    ("Seating", r"seating"),
    ("Length", r"(overall )?length"),
    ("Width", r"(overall )?width"),
    ("Height", r"(overall )?height"),
    ("Wheelbase", r"wheel ?base"),
    ("Ground clearance", r"ground clearance"),
    ("Fuel tank", r"fuel tank"),
    ("Boot space", r"boot|luggage"),
    ("Kerb weight", r"kerb weight"),
    ("Front brake", r"^(front|brake front|front brake)s?$"),
    ("Rear brake", r"^(rear|brake rear|rear brake)s?$"),
    ("Tyres", r"^(tyre|tyres|tyre size|front tyre|size)$"),
    ("Front suspension", r"front suspension|suspension front"),
    ("Rear suspension", r"rear suspension|suspension rear"),
]


def clean_val(v):
    s = " ".join(str(v).replace("&amp;", "&").split()).rstrip("*").strip()
    return s if s and s not in ("-", "—", "NA", "N/A") else None


def canon_specs(specs, v, ev):
    f = flat(specs)
    out = {}
    for key, pat in CANON:
        for name, val in f.items():
            if re.search(pat, name, re.I) and (val := clean_val(val)):
                if key == "Mileage" and ev:
                    continue
                out.setdefault(key, val)
                break
    for k in ("Seating", "Drive", "Battery", "Home charger"):  # Mahindra/EV variant attributes
        if k in f and k not in out and clean_val(f[k]):
            out[k] = clean_val(f[k])
    UNITS = {"Length": "mm", "Width": "mm", "Height": "mm", "Wheelbase": "mm", "Ground clearance": "mm",
             "Fuel tank": "litres", "Boot space": "litres", "Kerb weight": "kg"}
    for key, unit in UNITS.items():
        if out.get(key) and re.fullmatch(r"[\d.,\s]+(-[\d.,\s]+)?", str(out[key])):
            out[key] = f"{str(out[key]).strip()} {unit}"
    # "1 497", "1 497 cm3", "1,497cc" -> "1497 cc" so engine_cc() can read it
    if out.get("Engine") and (em := re.fullmatch(r"([\d][\d ,]*)\s*(cm3|cm³|cc)?", str(out["Engine"]).strip(), re.I)):
        out["Engine"] = f"{em.group(1).replace(' ', '').replace(',', '')} cc"
    if out.get("Seating") and re.fullmatch(r"\d+", str(out["Seating"])):
        out["Seating"] = f"{out['Seating']} seats"
    if v.get("airbags"):
        out["Airbags"] = str(v["airbags"])
    return out


_OVERLAYS = {}


def official_overlay(folder, model_slug, v):
    """Specs from <brand>/official-specs.json (brochure spec tables) for one variant.

    The file holds brand-wide engine rules and per-model rules; a rule matches
    on the variant name (regex), source fuel and source transmission. Later
    rules win. Used only to fill fields the variant's own data lacks.
    """
    if folder not in _OVERLAYS:
        path = os.path.join(SRC, folder, "official-specs.json")
        _OVERLAYS[folder] = json.load(open(path)) if os.path.exists(path) else {}
    data = _OVERLAYS[folder]
    if not data:
        return {}
    model = (data.get("models") or {}).get(model_slug, {})
    out = dict(model.get("all") or {})

    def matches(rule):
        if rule.get("name") and not re.search(rule["name"], v["name"], re.I):
            return False
        if rule.get("fuel") and rule["fuel"].lower() != str(v.get("fuel", "")).lower():
            return False
        if rule.get("trans") and not re.search(rf"^(?:{rule['trans']})$", str(v.get("transmission", "")), re.I):
            return False
        return True

    for rule in (data.get("engines") or []) + (model.get("rules") or []):
        if matches(rule):
            out.update(rule["specs"])
    if model.get("seats_from_name"):
        m = re.search(r"(?:\b|[\[(])([4-9])\s*(?:s|str|seater)\b", v["name"], re.I) or re.search(
            r"(?:^|\s|\()([4-9])\)?\s*$", v["name"])
        if m:
            out["Seating"] = f"{m.group(1)} seats"
    return out


def engine_cc(specs):
    m = re.search(r"(\d[\d ,]*\.?\d*)\s*(cc|cm3|cm³)", specs.get("Engine", ""), re.I)
    if not m:
        return None
    try:
        n = int(float(m.group(1).replace(" ", "").replace(",", "")))
        return n if n > 0 else None
    except ValueError:
        return None


def short_name(name, model, brand_name):
    words = name.split()
    drop = {w.lower() for w in (model + " " + brand_name + " new all the").split()}
    while len(words) > 1 and words[0].lower().strip("()") in drop:
        words.pop(0)
    s = " ".join(words).strip(" -–")
    return s or name


def lakh(p):
    return f"₹{p / 100000:.2f} lakh"


def gearbox_family(ts):
    fam = sorted({"manual" if t == "manual" else "automatic" for t in ts if t != "not_applicable"})
    return " and ".join(fam)


def summary_for(brand_name, model, body, variants, cat):
    fuels = sorted({v["fuel"] for v in variants})
    fuel_txt = ", ".join({"petrol": "petrol", "diesel": "diesel", "cng": "CNG", "petrol_cng": "petrol + CNG", "electric": "electric",
                          "hybrid": "hybrid"}[f] for f in fuels)
    kind = {"compact_suv": "compact SUV", "suv": "SUV", "muv": "MUV", "minivan": "MPV", "hatchback": "hatchback", "sedan": "sedan",
            "pickup": "pickup", "scooter": "scooter", "motorcycle": "motorcycle", "coupe": "coupe", "convertible": "convertible"}.get(body, body)
    if "electric" in fuels and len(fuels) == 1 and kind in ("scooter", "motorcycle", "SUV", "MPV", "sedan", "MUV", "hatchback", "compact SUV"):
        kind = "electric " + kind
        fuel_txt = ""
    prices = sorted(v["price"] for v in variants)
    gb = gearbox_family([v["trans"] for v in variants])
    article = "an" if kind[:1].lower() in "aeiou" or kind.startswith(("MPV", "MUV", "SUV")) else "a"
    parts = [f"The {brand_name} {model} is {article} {kind} offered in {len(variants)} variant{'s' if len(variants) != 1 else ''}"
             + (f" with {fuel_txt} power" if fuel_txt else "") + (f" and {gb} gearbox options" if gb and cat == "car" else "") + "."]
    parts.append(f"Ex-showroom prices range from {lakh(prices[0])} to {lakh(prices[-1])}." if prices[0] != prices[-1]
                 else f"The ex-showroom price is {lakh(prices[0])}.")
    sp = [v["specs"] for v in variants]
    engines = sorted({v.get("Engine") for v in sp if v.get("Engine")})
    powers = [v.get("Max power") for v in sp if v.get("Max power")]
    if engines:
        parts.append(f"Engine options: {', '.join(engines[:3])}" + (f", with up to {powers[-1].split('[')[0].strip()} of power." if powers else "."))
    mil = sorted({v.get("Mileage") for v in sp if v.get("Mileage")})
    rng = sorted({v.get("Range") for v in sp if v.get("Range")})
    if mil:
        parts.append(f"Claimed fuel efficiency: {mil[0]}" + (f" to {mil[-1]}" if len(mil) > 1 else "") + ".")
    if rng:
        parts.append(f"Claimed driving range: {rng[0]}" + (f" to {rng[-1]}" if len(rng) > 1 else "") + (" km" if not re.search(r"km", rng[-1], re.I) else "") + ".")
    airbags = sorted({int(v["Airbags"]) for v in sp if str(v.get("Airbags", "")).isdigit()})
    if airbags:
        parts.append(f"Safety includes {airbags[0]} airbags as standard" + (f" (up to {airbags[-1]})" if airbags[-1] > airbags[0] else "") + ".")
    if cat == "car":
        parts.append("Join a buying group on GroupDrive in your city to get a better on-road price when buyers book together.")
    return " ".join(parts)


def highlights_for(variants, colours):
    prices = sorted(v["price"] for v in variants)
    out = [f"From {lakh(prices[0])} ex-showroom", f"{len(variants)} variant{'s' if len(variants) != 1 else ''}"]
    sp = [v["specs"] for v in variants]
    if any(s.get("Range") for s in sp):
        out.append("Range up to " + max((s["Range"] for s in sp if s.get("Range")), key=lambda x: float(re.sub(r"[^\d.]", "", x.split()[0] if x else "0") or 0)))
    elif any(s.get("Mileage") for s in sp):
        out.append("Mileage up to " + sorted({s["Mileage"] for s in sp if s.get("Mileage")})[-1])
    ab = sorted({int(s["Airbags"]) for s in sp if str(s.get("Airbags", "")).isdigit()})
    if ab:
        out.append(f"{ab[0]} airbags standard")
    if colours:
        out.append(f"{len(colours)} colours")
    return out[:5]


def swatch(c):
    hexes = c.get("hex") or []
    if isinstance(hexes, str):
        hexes = [hexes]
    if hexes:
        return hexes[0]
    n = c["name"].lower().split(" with ")[0]
    return next((h for k, h in SWATCH if k in n), "#8a8f98")


def vehicles_for(folder):
    slug_b, brand_name, cat, _ = BRANDS[folder]
    index = json.load(open(os.path.join(SRC, folder, "index.json")))
    for m in index:
        d = json.load(open(os.path.join(SRC, folder, m["slug"] + ".json")))
        # Bajaj source groups models into families; on the site each model is its own vehicle.
        groups = [(v.get("model_name") or v["name"].replace("Bajaj ", ""), [v]) for v in d["variants"]] if folder == "bajaj" else [(d["model"], d["variants"])]
        for model, vs in groups:
            model = re.sub(rf"^{re.escape(brand_name.split()[0])}\s+", "", model).strip()
            body = body_of(m.get("channel"), cat, m["slug"] if folder == "maruti" else None)
            ev_model = all(fuel_of(v["fuel"], cat) == "electric" for v in vs)
            featuresets, variants, used = [], [], set()
            for v in vs:
                p = v["ex_showroom_surat"]
                price = p.get("standard") or p.get("non_metallic") or p.get("metallic") or min(p.values())
                fuel = fuel_of(v["fuel"], cat)
                specs = canon_specs(v.get("specifications"), v, fuel == "electric")
                specs = {**official_overlay(folder, m["slug"], v), **specs}
                if fuel == "electric":
                    specs.pop("Mileage", None)
                trans = trans_of(v.get("transmission") or specs.get("Transmission"), body, fuel)
                name = short_name(v["name"], model, brand_name)
                base = slugify(name)
                vs_slug, k = base, 2
                while vs_slug in used:
                    vs_slug, k = f"{base}-{k}", k + 1
                used.add(vs_slug)
                feats = v.get("features") or {}
                fi = None
                if feats:
                    key = json.dumps(feats, sort_keys=True, ensure_ascii=False)
                    if key not in featuresets:
                        featuresets.append(key)
                    fi = featuresets.index(key)
                road = v.get("on_road_gujarat") or {}
                variants.append({"name": name, "slug": vs_slug, "fuel": fuel, "trans": trans, "cc": engine_cc(specs), "specs": specs,
                                 "fs": fi, "price": int(price), "dual": p.get("dual_tone"),
                                 "road_tax": road.get("rto", road.get("road_tax")), "insurance": road.get("insurance"),
                                 "other": road.get("handling")})
            colours = [{"name": c["name"], "hex": swatch(c)} for c in d.get("colours") or []]
            vslug = slugify(f"{slug_b}-{model}") if not slugify(model).startswith(slug_b) else slugify(model)
            yield {"brand": slug_b, "model": model, "slug": vslug, "category": cat, "body": body,
                   "summary": summary_for(brand_name, model, body, variants, cat),
                   "highlights": highlights_for(variants, colours), "colours": colours,
                   "source": f"Official ex-showroom price: {d.get('official_page', '')}",
                   "featuresets": [json.loads(f) for f in featuresets], "variants": variants, "ev": ev_model}


def pack(vs):
    """Compact chunk: shared feature-string pool `p`, spec-key list `k`, per-model spec/feature sets, variants as arrays."""
    pool, keys, out = {}, {}, []
    for v in vs:
        fsets = [{sec: [pool.setdefault(x, len(pool)) for x in items] for sec, items in fs.items()} for fs in v["featuresets"]]
        specsets, rows = [], []
        for x in v["variants"]:
            sp = [[keys.setdefault(k, len(keys)), val] for k, val in x["specs"].items()]
            if sp not in specsets:
                specsets.append(sp)
            rows.append([x["name"], x["slug"], x["fuel"], x["trans"], x["cc"], x["price"], x["dual"], specsets.index(sp), x["fs"],
                         x["road_tax"], x["insurance"], x["other"]])
        out.append({"b": v["brand"], "m": v["model"], "s": v["slug"], "c": v["category"], "t": v["body"], "y": v["summary"],
                    "h": v["highlights"], "o": v["colours"], "src": v["source"], "e": v["ev"], "f": fsets, "q": specsets, "x": rows})
    return {"p": list(pool), "k": list(keys), "v": out}


brands = [{"slug": s, "name": n, "category": c, "website": w} for s, n, c, w in BRANDS.values()]
# Optional 3rd argument: comma-separated source folders to import (default: all brands).
ONLY = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else set(BRANDS)
allv = [v for folder in BRANDS if folder in ONLY for v in vehicles_for(folder)]
size_of = lambda vs: len(json.dumps(pack(vs), ensure_ascii=False, separators=(",", ":")))
chunks, cur = [], []
for v in allv:
    if cur and size_of(cur + [v]) > MAX:
        chunks.append(cur)
        cur = []
    cur.append(v)
chunks.append(cur)
for i, c in enumerate(chunks, 1):
    json.dump({"brands": brands if i == 1 else [], **pack(c)}, open(os.path.join(OUT, f"payload-{i:02d}.json"), "w"),
              ensure_ascii=False, separators=(",", ":"))
json.dump(sorted({v["slug"] for v in allv}), open(os.path.join(OUT, "vehicle-slugs.json"), "w"))
total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.startswith("payload"))
print(f"{len(allv)} vehicles, {sum(len(v['variants']) for v in allv)} variants, {len(chunks)} chunks, {total // 1024} KB total")
