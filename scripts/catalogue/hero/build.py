# build.py RAW_DIR OUT_DIR : Hero MotoCorp models with specs and their starting/top ex-showroom
# price (Hero's site lists a price range per model, not per variant).
import datetime, json, os, re, sys

raw, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
feed = json.load(open(os.path.join(raw, "specs.json")))
GROUPS = ["Dimensions", "Electricals", "Engine", "Suspension", "TransmissionChassis", "WheelsTyres", "Brakes", "Battery", "Motor", "Performance"]


def label(key):
    rest = key[len("specifications"):]
    group = next((g for g in GROUPS if rest.startswith(g)), "Other")
    name = re.sub(r"(?<!^)([A-Z])", r" \1", rest[len(group):] if group != "Other" else rest).strip()
    return {"TransmissionChassis": "Transmission", "WheelsTyres": "Wheels & Tyres"}.get(group, group), name


index, seen = [], set()
for category, items in feed.items():
    for item in items:
        d = item["data"]
        name = re.sub(r"\s*\|.*", "", d.get("productName") or item["title"]).replace("Hero ", "").strip()
        slug = item["title"]
        if slug in seen or not d.get("productLowPrice"):
            continue
        seen.add(slug)
        specs = {}
        for k, v in d.items():
            if k.startswith("specifications") and isinstance(v, str) and v.strip() and "Disable" not in k:
                g, n = label(k)
                specs.setdefault(g, {})[n] = " ".join(v.split())
        low, high = int(d["productLowPrice"]), int(d.get("productHighPrice") or d["productLowPrice"])
        ev = "electric" in json.dumps(specs).lower() and "Motor" in specs
        base = {"fuel": "Electric" if ev else "Petrol", "transmission": None, "specifications": specs, "features": {}}
        variants = [{"name": f"{name} (starting price)", **base, "ex_showroom_surat": {"standard": low}}]
        if high > low:
            variants.append({"name": f"{name} (top variant price)", **base, "ex_showroom_surat": {"standard": high}})
        data = {"brand": "Hero", "model": name, "slug": slug, "official_page": f"https://www.heromotocorp.com/en-in/{category.lower()}/{slug}.html",
                "brochure_pdf": None, "price_city": "Hero's website default ex-showroom price (state not stated)",
                "ex_showroom_min": low, "ex_showroom_max": high, "fuel_types": [base["fuel"]], "transmissions": [],
                "colours": [], "variants": variants,
                "notes": ["Hero lists a price range per model, not per variant: entries are the starting and top prices."],
                "fetched_on": datetime.date.today().isoformat()}
        json.dump(data, open(os.path.join(out, f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
        index.append({"model": name, "slug": slug, "channel": category.rstrip("s").title(), "variants": len(variants), "colours": 0,
                      "ex_showroom_min": low, "ex_showroom_max": high, "fuel_types": data["fuel_types"], "transmissions": [], "brochure_pdf": None})
index.sort(key=lambda m: (m["channel"], m["ex_showroom_min"]))
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=2, ensure_ascii=False)
print(len(index), "models;", sum(1 for m in index if m["channel"] == "Scooter"), "scooters")
