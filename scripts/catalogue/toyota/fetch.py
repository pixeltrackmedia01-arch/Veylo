# fetch.py OUTDIR : Toyota India dealer price lists for Surat (webapi.toyotabharat.com, XML).
# Flow used by toyotabharat.com/pricelist: states -> cities -> Surat sales dealers -> price list
# per dealer and model. Writes models.json, dealers.json and price-<modelId>.json.
import json, os, subprocess, sys, time
import xml.etree.ElementTree as ET

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
API = "https://webapi.toyotabharat.com/1.0/api/"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"


def to_obj(el):
    kids = list(el)
    if not kids:
        return (el.text or "").strip()
    if len({k.tag for k in kids}) == 1 and len(kids) > 1:
        return [to_obj(k) for k in kids]
    return {k.tag: to_obj(k) for k in kids}


def post(path):
    r = subprocess.run(["curl", "-sS", "-m", "40", "-X", "POST", "-A", UA, "-H", "Origin: https://www.toyotabharat.com",
                        "-H", "Referer: https://www.toyotabharat.com/pricelist/", "-H", "Content-Type: application/json",
                        "-d", "{}", API + path], capture_output=True, text=True)
    time.sleep(1)
    try:
        root = ET.fromstring(r.stdout)
    except ET.ParseError:
        return None
    o = to_obj(root)
    return o if isinstance(o, list) else ([o] if isinstance(o, dict) and o else (list(o.values())[0] if isinstance(o, dict) else o))


def as_list(x):
    return x if isinstance(x, list) else [x]


state = next(s for s in post("pricestates") if "gujarat" in s["Name"].lower())
city = next(c for c in post(f"pricestates/{state['Id']}/pricecities") if c["Name"].strip().lower() == "surat")
dealers = as_list(post(f"businesscities/{city['Id']}/websalesdealers") or [])
models = as_list(post("price/models") or [])
json.dump({"state": state, "city": city, "dealers": dealers}, open(os.path.join(OUT, "dealers.json"), "w"), indent=1)
json.dump(models, open(os.path.join(OUT, "models.json"), "w"), indent=1)
print("state", state["Id"], "city", city["Id"], "dealers", len(dealers), "models", len(models))
# Ex-showroom prices are the same at every dealer in a city; use the first Surat dealer.
dealer = dealers[0]
for m in models:
    rows = as_list(post(f"price/list/{dealer['Id']}/{m['Id']}") or [])
    for r in rows:
        r.pop("Dealer", None)
    json.dump(rows, open(os.path.join(OUT, f"price-{m['Id']}.json"), "w"), indent=1)
    print(f"{m['Name']:<24} {len(rows):>3} variants")
