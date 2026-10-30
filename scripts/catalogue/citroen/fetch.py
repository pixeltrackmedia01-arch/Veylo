# fetch.py OUTDIR : Citroën India models and per-model price lists (api.citroenindia.com, the
# data behind citroen.in/tools/check-price.html).
import json, os, subprocess, sys, time

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
API = "https://api.citroenindia.com/api/vehicles/"


def get(path):
    r = subprocess.run(["curl", "-sS", "-m", "30", "-A", UA, "-H", "Origin: https://www.citroen.in", API + path], capture_output=True, text=True)
    time.sleep(1)
    return json.loads(r.stdout).get("data")


models = get("models?page=1&limit=500")
for m in models:
    m["prices"] = get(f"vehicle-configs/price-list?modelId={m['id']}") or []
    print(f"{m['displayName']:<22} {len(m['prices'])} variants")
json.dump(models, open(os.path.join(OUT, "models.json"), "w"), indent=1, ensure_ascii=False)
