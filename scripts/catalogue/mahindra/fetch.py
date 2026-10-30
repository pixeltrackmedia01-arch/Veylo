# fetch.py OUTDIR [PID,PID…] : Mahindra variant prices and colours from auto.mahindra.com and
# mahindraelectricsuv.com (both Salesforce Commerce).
# For each model, Product-Variation returns the variant cards (name, code, ex-showroom price) for
# one fuel x gearbox x seating combination, so every selectable combination is requested.
import itertools, json, os, re, subprocess, sys, time, urllib.parse

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
AUTO = ("https://auto.mahindra.com", "Sites-amc-Site")
ESUV = ("https://www.mahindraelectricsuv.com", "Sites-esuv-Site")
# model code -> site. XUV 3XO REVX variants are listed under X3XO.
SITES = {"BOL": AUTO, "NEO": AUTO, "NEOP": AUTO, "SCRC": AUTO, "SCN": AUTO, "THRN": AUTO, "TH5D": AUTO,
         "X3XO": AUTO, "X400": AUTO, "X7XO": AUTO, "MBE6": ESUV, "MXV9": ESUV, "XEV9": ESUV}
PIDS = sys.argv[2].split(",") if len(sys.argv) > 2 else list(SITES)
SKIP_ATTRS = {"colorCode", "variantCode"}


def get(params):
    host, site = SITES[params["pid"]]
    url = f"{host}/on/demandware.store/{site}/en_IN/Product-Variation?" + urllib.parse.urlencode(params)
    for _ in range(3):
        r = subprocess.run(["curl", "-sS", "-m", "40", "-A", UA, url], capture_output=True, text=True)
        time.sleep(1)
        try:
            return json.loads(r.stdout)
        except json.JSONDecodeError:
            continue
    return None


CARD = re.compile(r'data-priceObj="([^"]+)"\s+data-variantName="([^"]+)"\s+value="[^"]*?variantCode=(\w+)')

def default_params(pid):
    """The endpoint needs a starting selection; take the default one from the variant page."""
    page = subprocess.run(["curl", "-sS", "-m", "40", "-A", UA, f"{SITES[pid][0]}/own-online/variant-selection?pid={pid}"],
                          capture_output=True, text=True).stdout
    m = re.search(r'Product-Variation\?([^"\']+)', page)
    if not m:
        return {"pid": pid, "quantity": 1}
    q = dict(urllib.parse.parse_qsl(m.group(1).replace("&amp;", "&"), keep_blank_values=True))
    return {k: v for k, v in q.items() if v and k.startswith(("pid", "quantity", "dwvar_"))}


for pid in PIDS:
    base = get(default_params(pid))
    if not base or "product" not in base:
        print("FAIL", pid)
        continue
    p = base["product"]
    attrs = {a["attributeId"]: [v["id"] for v in a["values"]] for a in p["variationAttributes"] if a["attributeId"] not in SKIP_ATTRS}
    cards, combos = {}, 0
    for values in itertools.product(*attrs.values()):
        q = {"pid": pid, "quantity": 1} | {f"dwvar_{pid}_{k}": v for k, v in zip(attrs, values)}
        j = get(q)
        if not j:
            continue
        combos += 1
        for price, name, code in CARD.findall(json.dumps(j, ensure_ascii=False).replace('\\"', '"')):
            cards[code] = {"code": code, "name": name, "price": int(re.sub(r"\D", "", price)),
                           **{k: v for k, v in zip(attrs, values)}}
    json.dump({"pid": pid, "name": p.get("productName"), "base": base, "attributes": attrs, "cards": list(cards.values())},
              open(os.path.join(OUT, f"{pid}.json"), "w"), ensure_ascii=False)
    print(f"{pid:<5} {p.get('productName','')[:18]:<18} combos={combos:<3} variants={len(cards)}")
