# fetch.py OUTDIR : Kia India variants with Surat ex-showroom prices, colours, engines and
# gearboxes from the configurator feed (configure.getVrntList.do), plus each model's showroom
# page (for the brochure link). The model list comes from the EMI calculator feed.
import json, os, re, subprocess, sys, time

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
API = "https://www.kia.com/api/kia2_in/"
STATE, CITY = "GJ", "W32"  # Gujarat, Surat


def get(url, referer="https://www.kia.com/in/buy/emi-calculator.html"):
    r = subprocess.run(["curl", "-sS", "-m", "40", "-A", UA, "-H", f"Referer: {referer}", url], capture_output=True, text=True)
    time.sleep(1)
    return r.stdout


models = json.loads(get(API + "emiCalculator.getEmiData.do"))["data"]["modelAndVariant"]
for m in models:
    code, name = m["val1"]["key"], m["val1"]["value"]
    data = json.loads(get(f"{API}configure.getVrntList.do?modelCode={code}&stateCode={STATE}&cityCode={CITY}") or "{}").get("data") or {}
    json.dump({"code": code, "name": name, **data}, open(os.path.join(OUT, f"{code}.json"), "w"), ensure_ascii=False)
    priced = sum(1 for v in data.get("variants", []) if any(p.get("intraExsrPrice") for p in (v.get("price") or {}).values()))
    print(f"{name:<12} {code} variants={len(data.get('variants', []))} priced={priced}")

# Brochure links from each model's showroom page
PAGES = {"SYROS": "syros", "SONET": "sonet", "CLAVIS": "carens-clavis", "CARNIVAL": "carnival", "EV6": "ev6",
         "CARENS": "carens", "SORENTO": "sorento", "SYROS_EV": "syros-ev", "NEW_SELTOS": "seltos", "CLAVIS_EV": "carens-clavis-ev"}
brochures = {}
for name, slug in PAGES.items():
    html = get(f"https://www.kia.com/in/our-vehicles/{slug}/showroom.html", referer="https://www.kia.com/in/home.html")
    pdfs = re.findall(r'href="(/content/dam/kia2/in/en/[^"]+\.pdf)"', html)
    pdfs = [p for p in pdfs if "brochure" in p.lower()] or pdfs
    pdfs.sort(key=lambda p: ("Mobile" in p, len(p)))
    brochures[name] = "https://www.kia.com" + pdfs[0] if pdfs else None
json.dump(brochures, open(os.path.join(OUT, "brochures.json"), "w"), indent=1)
print("brochures:", sum(1 for v in brochures.values() if v), "/", len(brochures))
