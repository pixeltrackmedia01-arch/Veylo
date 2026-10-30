# fetch.py OUTDIR : Bajaj Auto active models (api/mc/getAllModels) with Gujarat ex-showroom prices
# (api/getOrpByModelCode, stateCode=GJ) — the data behind bajajauto.com's price widget.
import json, os, subprocess, sys, time

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"


def get(path):
    r = subprocess.run(["curl", "-sS", "-m", "40", "-A", UA, "-H", "Referer: https://www.bajajauto.com/", "https://www.bajajauto.com/api/" + path],
                       capture_output=True, text=True)
    time.sleep(1)
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return {}


models = get("mc/getAllModels").get("Data") or []
for m in models:
    res = (((get(f"getOrpByModelCode?modelCode={m['ModelCode']}&stateCode=GJ").get("Data") or {}).get("Output") or {}).get("Response") or {})
    m["price"] = int(str(res.get("ESRP", {}).get("Value", "")).replace(" ", "") or 0) or None
    m["variant_name"] = res.get("DisplayName", {}).get("Value")
    print(f"{m['ModelName']:<34} {m['ModelCode']:<10} {m['price']}")
json.dump(models, open(os.path.join(OUT, "models.json"), "w"), indent=1)
