# fetch.py OUTDIR : Honda Cars India Surat ex-showroom prices.
# /api/getCarPrice only answers for exact (car, fuel, transmission, grade) values and Honda
# publishes no option list, so known Honda India grade names are tried for every car; only
# combinations that return a price are kept. Also saves the car list and brochure links.
import json, os, subprocess, sys, time

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
API = "https://www.hondacarindia.com/api/"
GRADES = ["E", "S", "SV", "V", "VX", "ZX", "ZX+", "ZX+ Black", "ZRV", "Sport", "Apex", "Apex Edition", "Black Edition",
          "Signature Black Edition", "Alpha", "Elegant", "Prestige", "Signature", "Signature Edition"]
PETROL_TRANS = ["MT (Manual)", "CVT (Automatic)"]
HYBRID = [("e:HEV", "CVT (Automatic)"), ("e:HEV", "e-CVT (Automatic)")]  # as the car list labels the ZR-V


def call(method, path, body=None):
    cmd = ["curl", "-sS", "-m", "30", "-A", UA, "-X", method, API + path]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(body)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    time.sleep(0.4)
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return {}


ONLY = {"fuel": sys.argv[2]} if len(sys.argv) > 2 else None  # e.g. "e:HEV" to re-check hybrids only
cars = call("GET", "getAllCarsData").get("data") or []
json.dump(cars, open(os.path.join(OUT, "cars.json"), "w"), indent=1)
prices = []
for car in cars:
    cid = car["carModelId"]
    combos = [("Petrol", t, g) for g in GRADES for t in PETROL_TRANS] + [(f, t, g) for g in GRADES for f, t in HYBRID]
    if ONLY:
        combos = [c for c in combos if c[0] == ONLY["fuel"]]
    found = 0
    for fuel, trans, grade in combos:
        res = call("POST", "getCarPrice", {"carID": cid, "city": "Surat", "fuelType": fuel, "transmission": trans, "variant": grade})
        for row in res.get("data") or []:
            if row.get("P_Price"):
                prices.append({"carId": cid, "fuel": fuel, "transmission": trans, "grade": grade, "price": int(row["P_Price"])})
                found += 1
    brochure = call("GET", f"getCarBrochureUrl?carID={cid}")
    car["brochure"] = brochure.get("data")
    print(f"{car['carModelName']:<16} id={cid} variants={found}")
name = "prices-%s.json" % ONLY["fuel"].replace(":", "") if ONLY else "prices.json"
json.dump(prices, open(os.path.join(OUT, name), "w"), indent=1)
json.dump(cars, open(os.path.join(OUT, "cars.json"), "w"), indent=1)
