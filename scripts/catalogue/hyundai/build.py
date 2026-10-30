# hyundai_build.py RAW_DIR BROCHURE_DIR OUT_DIR
# Normalises Hyundai India data: Surat ex-showroom prices and engine specifications from
# hyundai.com, per-trim features and colours from the official brochures.
import datetime, html, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hyundai_brochure as hb  # noqa: E402

raw, brochures, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
SITE = "https://www.hyundai.com/in/en/find-a-car"
BROCHURE_URL = "https://www.hyundai.com/content/dam/hyundai/in/en/data/brochure"

# slug, name, brochure (text file and public PDF name), feature-table trims in column order
MODELS = [
    ("grand-i10-nios", "Grand i10 Nios", "grand-i10-nios", ["Era", "Magna", "Corporate", "Sportz", "Sportz VIBE", "Sportz (O)", "Sportz (O) VIBE", "Asta"]),
    ("i20", "i20", "i20", ["Era", "Magna Executive", "Magna", "Sportz", "Sportz (O)", "Sportz (O) Knight", "Asta", "Asta (O)", "Asta (O) Knight"]),
    ("i20-n-line", "i20 N Line", "i20-n-line", ["N6", "N8"]),
    ("aura", "Aura", "aura", ["E", "S", "SX", "SX (O)"]),
    ("exter", "Exter", "exter", ["HX 2", "HX 3", "HX 4", "HX 4+", "HX 6", "HX 6 Knight", "HX 8", "HX 10", "HX 10 Knight"]),
    ("venue", "Venue", "venue", ["HX 2", "HX 4", "HX 5", "HX 5 Knight", "HX 5+", "HX 6", "HX 6T", "HX 6T Knight", "HX 7", "HX 8", "HX 8 Knight", "HX 10", "HX 10 Knight"]),
    ("venue-n-line", "Venue N Line", "venue-n-line", ["N6", "N10"]),
    ("bayon", "Bayon", "bayon", ["HX 2", "HX 3", "HX 3+", "HX 5", "HX 6", "HX 8", "HX 10"]),
    ("verna", "Verna", "verna", ["HX 2", "HX 4", "HX 6", "HX 6+", "HX 8", "HX 10"]),
    ("creta", "Creta", "creta", ["E", "EX", "EX (O)", "S (O)", "S (O) Knight", "SX", "SX Premium", "King", "King Knight", "Lounge Edition"]),
    ("creta-n-line", "Creta N Line", "creta-n-line", ["N10"]),
    ("creta-electric", "Creta Electric", "creta-ev", ["Executive", "Executive Tech", "Premium", "Excellence", "Excellence Knight", "Executive (O) LR", "Smart (O) LR", "Excellence LR", "Excellence LR Knight", "Lounge Edition"]),
    ("alcazar", "Alcazar", "alcazar", ["Executive", "Prestige", "Corporate", "Platinum", "Signature", "Signature Knight", "Lounge Edition"]),
    ("ioniq-5", "Ioniq 5", "ioniq-5", None),
]


def load(name):
    with open(os.path.join(raw, name)) as f:
        return json.load(f)


def norm_trim(s):
    s = s.lower().replace("knight edition", "knight")
    s = re.sub(r"\(\s*hc\s*\)|\[\s*hc\s*\]|\bdsl\b|\bdual tone\b|\bdt\b|\bcng\b|\b[67]s\b|\bedition\b", " ", s)
    return re.sub(r"\s+", "", s)


def match_trim(variant, trims):
    v = norm_trim(variant)
    for t in trims:
        if norm_trim(t) == v:
            return t
    if "lounge" in v:
        return next((t for t in trims if "lounge" in t.lower()), None)
    return None


def clean(v):
    return re.sub(r"\s+", " ", html.unescape(str(v))).strip()


def engine_specs(slug):
    """{engine name: {group: {spec: value}}} from hyundai.com's specification pages."""
    try:
        engines = load(f"{slug}-engines.json")
    except FileNotFoundError:
        return {}
    result = {}
    for e in engines:
        try:
            tree = load(f"{slug}-spec-{e['value']}.json")
        except (FileNotFoundError, json.JSONDecodeError):
            continue
        groups = {}

        def walk(nodes, group):
            for n in nodes:
                if "specName" in n:
                    val = clean(n.get("specValue") or "")
                    if val and val != "-":
                        groups.setdefault(group, {})[clean(n["specName"])] = val
                else:
                    walk(n.get("specificationVOList") or [], clean(n.get("specSubTypeName") or n.get("specTypeName") or group))
        walk(tree, "General")
        result[clean(e["text"])] = groups
    return result


def pick_engine(engines, row):
    """Choose the spec sheet for a price row by fuel, turbo and gearbox."""
    if not engines:
        return None
    desc = f"{row['engine']} {row['transmission']}".lower()
    fuel = row["fuelType"].lower()
    best, score = None, -1
    for name in engines:
        n = name.lower()
        s = 0
        s += 3 if ("diesel" in fuel) == ("crdi" in n or "diesel" in n) else -3
        s += 3 if ("cng" in fuel) == ("cng" in n or "bi-fuel" in n) else -3
        s += 2 if ("turbo" in desc) == ("turbo" in n) else -2
        s += 1 if ("dct" in desc) == ("dct" in n) else 0
        if s > score:
            best, score = name, s
    return best


def spec_table(text, col=0):
    """Brochure 'Technical specifications' table; col picks the value column when there are two
    (e.g. Creta Electric standard vs long range). Used when hyundai.com has no spec sheet."""
    lines = text.split("\n")
    start = next((i for i, l in enumerate(lines) if re.match(r"(?i)^\s*technical specifications", l)), None)
    if start is None:
        return {}
    group, out, pending = "General", {}, None
    for l in lines[start + 1:start + 60]:
        s = l.strip()
        if not s or s.startswith("*"):
            continue
        parts = [p for p in re.split(r"\s{3,}", s) if p]
        if pending and all(re.fullmatch(r"[\d.,]+[#^*]*", x) for x in parts):
            # values printed on their own line below a wrapped label, e.g. "Driving range (as per MIDC …"
            prev_group, label = pending
            out.setdefault(prev_group, {})[label] = (parts[col] if len(parts) > col else parts[0]).rstrip("*#^")
            group = prev_group
            pending = None
            continue
        if len(parts) == 1 and re.search(r"\(as per|range", s, re.I):
            pending = (group, re.sub(r"\s*\(as per.*", "", s) + " (km)")
            continue
        if len(parts) == 1 and len(s) < 40:
            group = s
        elif len(parts) >= 2 and parts[0] != "Items" and parts[1] not in ("\u221a",):
            value = parts[1 + col] if len(parts) > 1 + col else parts[1]
            out.setdefault(group, {})[parts[0]] = value.rstrip("*#^")
    return out


def feature_list(text):
    """Feature list for a single-variant brochure (Ioniq 5)."""
    lines = text.split("\n")
    start = next(i for i, l in enumerate(lines) if re.match(r"(?i)^\s*key features", l))
    section, group, out = "General", "", {}
    for l in lines[start + 3:]:
        s = l.strip()
        if not s:
            continue
        if re.match(r"(?i)^technical specifications", s):
            break
        low = s.lower()
        if len(s) < 40 and any(low.startswith(k) for k in hb.SECTIONS) and len(s.split()) <= 4:
            section = s
            continue
        parts = [p for p in re.split(r"\s{3,}", s) if p]
        if l.startswith(" ") and len(parts) == 1 and group:
            name = f"{group} – {parts[0]}"
        elif len(parts) >= 2:
            group, name = parts[0], " – ".join(parts)
        else:
            group, name = s, s
        if s in ("IONIQ 5",) or "|" in s:
            name = s.replace(" | ", ": ")
        out.setdefault(section, []).append(name)
    return out


def build(slug, name, brochure, trims):
    rows = load(f"{slug}-price.json")
    btext = open(os.path.join(brochures, f"{brochure}.txt")).read()
    if slug == "alcazar":  # three feature panels side by side; read from the cropped panels
        ftext = open(os.path.join(brochures, "alcazar-panels.txt")).read()
    else:
        ftext = btext
    trim_features = hb.features(ftext, trims) if trims else {}
    engines = {k: v for k, v in engine_specs(slug).items() if v}  # drop empty spec sheets
    variants = {}
    for r in rows:
        trim_raw = clean(f"{r['variant']} {r.get('edition') or ''}")
        dual = bool(re.search(r"\bDT\b|dual tone", trim_raw, re.I))
        base_trim = clean(re.sub(r"\bDT\b|\bDual Tone\b", " ", trim_raw, flags=re.I))
        key = (r["engine"].strip(), r["transmission"], base_trim, r["fuelType"])
        price = int(re.sub(r"\D", "", r["price"]))
        v = variants.get(key)
        if not v:
            eng = pick_engine(engines, r)
            trim = match_trim(base_trim, trims) if trims else None
            v = variants[key] = {
                "name": clean(f"{clean(r['engine'])} {r['transmission']} {base_trim}"
                              + (" CNG" if "cng" in r["fuelType"].lower() and "cng" not in base_trim.lower() else "")),
                "trim": base_trim,
                "brochure_trim": trim,
                "fuel": r["fuelType"].replace("Dual CNG", "CNG (dual cylinder)"),
                # Hyundai's feed puts the battery size in the transmission field for EVs
                "transmission": "Automatic (single-speed)" if r["fuelType"] == "Electric" else r["transmission"],
                "ex_showroom_surat": {},
                "engine": eng,
                "specifications": engines.get(eng) if eng else spec_table(btext, col=1 if re.search(r"\bLR\b", base_trim) else 0),
                "features": (trim_features.get(trim, {}) if trims else feature_list(btext)) if (trim or not trims) else {},
            }
        v["ex_showroom_surat"]["dual_tone" if dual else "standard"] = price
    for v in variants.values():
        feats = " | ".join(f.lower() for group in v["features"].values() for f in group)
        v["airbags"] = 6 if re.search(r"6 airbags|curtain", feats) else (2 if "airbag" in feats else None)
    vs = sorted(variants.values(), key=lambda x: min(x["ex_showroom_surat"].values()))
    prices = [p for v in vs for p in v["ex_showroom_surat"].values()]
    return {
        "brand": "Hyundai",
        "model": name,
        "slug": slug,
        "official_page": f"{SITE}/{slug}/highlights",
        "brochure_pdf": f"{BROCHURE_URL}/{brochure}.pdf",
        "price_city": "Surat, Gujarat",
        "ex_showroom_min": min(prices),
        "ex_showroom_max": max(prices),
        "fuel_types": sorted({v["fuel"] for v in vs}),
        "transmissions": sorted({v["transmission"] for v in vs}),
        "colours": [{"name": c} for c in hb.colours(btext)],
        "engines": sorted(engines) if engines else None,
        "variants": vs,
        "notes": [],
    }


# body type as Hyundai lists it (price service model list)
CATEGORY = {"grand-i10-nios": "Hatchback", "i20": "Hatchback", "i20-n-line": "Hatchback", "aura": "Sedan", "verna": "Sedan",
            "exter": "SUV", "venue": "SUV", "venue-n-line": "SUV", "bayon": "SUV", "creta": "SUV", "creta-n-line": "SUV",
            "alcazar": "SUV", "creta-electric": "Electric SUV", "ioniq-5": "Electric SUV"}
index = []
for slug, name, brochure, trims in MODELS:
    d = build(slug, name, brochure, trims)
    d["fetched_on"] = datetime.date.today().isoformat()
    missing = [v["name"] for v in d["variants"] if trims and not v["brochure_trim"]]
    if missing:
        d["notes"].append("No brochure feature column for: " + ", ".join(missing))
    with open(os.path.join(out, f"{slug}.json"), "w") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
    index.append({k: d[k] for k in ("model", "slug", "ex_showroom_min", "ex_showroom_max", "fuel_types", "transmissions", "brochure_pdf")}
                 | {"channel": CATEGORY.get(slug, ""), "variants": len(d["variants"]), "colours": len(d["colours"])})
    print(f"{name:<15} {len(d['variants']):>3} variants {len(d['colours']):>3} colours  {d['ex_showroom_min']/1e5:6.2f}-{d['ex_showroom_max']/1e5:6.2f} lakh"
          f"  no-specs={sum(1 for v in d['variants'] if not v['specifications'])} no-features={sum(1 for v in d['variants'] if not v['features'])}")
with open(os.path.join(out, "index.json"), "w") as f:
    json.dump(index, f, indent=2, ensure_ascii=False)
