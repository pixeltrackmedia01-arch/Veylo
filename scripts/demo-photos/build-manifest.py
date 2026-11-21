"""Build the local-only demo photo manifest (.demo-photos.json).

Maps each published vehicle slug to photo files, so `npm run dev` with
LOCAL_DEMO_PHOTOS=true can show them. The photos are never placed in `public/`
or a production build: the route that serves them 404s in production and
next.config.mjs / .vercelignore keep demo-photos/ out of deployments.

Usage (from the repo root):
  python scripts/demo-photos/build-manifest.py --cars "<Car Images dir>" --bikes "<BikeWale dir>" [--copy]

With --copy the picked photos are copied into demo-photos/ (committed to this
private repo) and the manifest stores repo-relative paths, so a fresh clone
works without the original folders.

Car folders:  <cars>/<Brand>/<Model>/{exterior_,interior_,colour_}*.jpg
Bike folders: <bikes>/<Brand>/<Model>/NN - <shot>.jpg
"""
import argparse
import json
import re
import shutil
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / ".demo-photos.json"
COPY_DIR = REPO / "demo-photos"
MAX_PER_MODEL = 44

# Manufacturer name in the database -> (kind, local brand folder)
BRANDS = {
    "Ather Energy": ("bike", "Ather"), "Bajaj Auto": ("bike", "Bajaj"), "Hero MotoCorp": ("bike", "Hero"),
    "Honda Motorcycle & Scooter India": ("bike", "Honda"), "Ola Electric": ("bike", "OLA"),
    "Royal Enfield": ("bike", "Royal Enfield"), "TVS Motor": ("bike", "TVS"),
    "BYD": ("car", "BYD"), "Citroën": ("car", "Citroen"), "Honda Cars": ("car", "Honda"),
    "Hyundai": ("car", "Hyundai"), "Jeep": ("car", "Jeep"), "Kia": ("car", "Kia"), "Mahindra": ("car", "Mahindra"),
    "Maruti Suzuki": ("car", "Maruti"), "MG Motor": ("car", "MG"), "Nissan": ("car", "Nissan"),
    "Renault": ("car", "Renault"), "Skoda": ("car", "Skoda"), "Tata Motors": ("car", "Tata"),
    "Toyota": ("car", "Toyota"), "Volkswagen": ("car", "Volkswagen"),
}

# Hand-checked: vehicle slug -> local model folder, or None when no folder is the same vehicle.
ALIASES = {
    "maruti-suzuki-grand-vitara": None, "mahindra-thar": None, "toyota-fortuner": None, "ola-electric-s1": None,
    "honda-cars-amaze-2nd-gen": None,
    "maruti-suzuki-ertiga": "Suzuki Ertiga Tour", "maruti-suzuki-wagonr": "Wagon R",
    "mahindra-xuv400": "XUV400 EV", "mahindra-scorpio-classic": "Scorpio", "mahindra-scorpio-n": "Scorpio N",
    "toyota-urban-cruiser-taisor": "Taisor", "toyota-legender": "Fortuner Legender",
    "mg-motor-windsor-pro": "Windsor EV", "ola-electric-s1-x-plus": "S1 X",
    "ather-450s": "450X", "ather-450-apex": "450X",
    "hero-destini-125-xtec": "Destini 125", "hero-new-destini-125": "Destini 125",
    "hero-pleasure-plus-xtec": "Pleasure Plus", "hero-splendor-plus-xtec-2-0": "Splendor Plus Xtec",
    "hero-glamour-x": "Glamour X 125", "hero-glamour-xtec": "Glamour", "hero-super-splendor": "Super Splendor Xtec",
    "honda-activa": "Activa", "honda-2w-activa-110": "Activa", "honda-2w-activa110-anniversary-edition": "Activa",
    "honda-2w-activa125-anniversary-edition": "Activa 125", "honda-2w-dio-110": "Dio",
    "honda-2w-dio-125-x-edition": "Dio 125", "honda-2w-shine-125": "Shine",
    "honda-2w-shine-125-limited-edition": "Shine", "honda-2w-shine100-dx": "Shine 100",
    "honda-2w-cb350-h-ness": "CB350", "honda-2w-cb350-rs": "CB350RS", "honda-2w-adv160": "ADV 160",
    "honda-2w-cb125-hornet": "CB 125 Hornet", "honda-2w-sp125": "SP 125",
    "tvs-apache-rtr-160-2v": "Apache RTR 160", "tvs-raider": "Raider 125", "tvs-xl-100": "XL 100 Heavy Duty",
    "bajaj-pulsar-rs200": "Pulsar RS 200", "bajaj-platina-110-drum": "Platina 110",
    "bajaj-freedom-125-ng04": "Freedom",
}

NOISE = {"maruti", "suzuki", "new", "the"}


def norm(s: str) -> str:
    s = s.lower().replace("+", " plus ").replace("ë", "e")
    return "".join(t for t in re.split(r"[^a-z0-9]+", s) if t and t not in NOISE)


def read_env() -> dict:
    env = {}
    p = REPO / ".env.local"
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", line)
            if m:
                env[m.group(1)] = m.group(2).strip().strip('"')
    return env


def fetch_vehicles(env: dict) -> list:
    url, key = env.get("NEXT_PUBLIC_SUPABASE_URL"), env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        sys.exit("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local first.")
    q = f"{url}/rest/v1/vehicles?select=id,slug,model_name,manufacturer:manufacturers(name)&status=eq.published"
    req = urllib.request.Request(q, headers={"apikey": key, "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def label(name: str) -> str:
    base = re.sub(r"^(\d+\s*-\s*|exterior_|interior_|colour_(\d+_)?)", "", Path(name).stem)
    base = re.sub(r"_[0-9A-Fa-f]{6}$", "", base)
    return re.sub(r"[-_]+", " ", base).strip()


def car_order(files: list) -> list:
    def rank(p: Path):
        n = p.name.lower()
        if n == "exterior_front-left-side.jpg":
            return (0, n)
        if n.startswith("exterior_") and any(k in n for k in ("front-right", "rear-left", "side", "rear-view")):
            return (1, n)
        if n.startswith("exterior_"):
            return (2, n)
        if n.startswith("colour_"):
            return (3, n)
        return (4, n)
    ordered = sorted(files, key=rank)
    # keep a mix: up to 17 exterior, every colour (max 16), 10 interior
    caps, picked, count = {0: 1, 1: 8, 2: 8, 3: 16, 4: 10}, [], {}
    for p in ordered:
        r = rank(p)[0]
        if count.get(r, 0) < caps[r]:
            picked.append(p)
            count[r] = count.get(r, 0) + 1
    return picked[:MAX_PER_MODEL]


def bike_order(files: list) -> list:
    files = sorted(files, key=lambda p: p.name.lower())
    hero = next((p for p in files if "front-three-quarter" in p.name.lower()), files[0] if files else None)
    rest = [p for p in files if p is not hero]
    return ([hero] if hero else []) + rest[: MAX_PER_MODEL - 1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cars", required=True, type=Path)
    ap.add_argument("--bikes", required=True, type=Path)
    ap.add_argument("--copy", action="store_true",
                    help="copy the picked photos into demo-photos/ and store repo-relative paths")
    a = ap.parse_args()
    if a.copy and COPY_DIR.exists():
        shutil.rmtree(COPY_DIR)

    def stored(p: Path, kind: str, brand_folder: str, model_folder: str) -> str:
        if not a.copy:
            return str(p.resolve())
        dest = COPY_DIR / ("cars" if kind == "car" else "bikes") / brand_folder / model_folder / p.name
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dest)
        return dest.relative_to(REPO).as_posix()

    vehicles = fetch_vehicles(read_env())
    manifest, missing = {}, []
    for v in vehicles:
        brand = (v.get("manufacturer") or {}).get("name", "")
        kind, folder = BRANDS.get(brand, (None, None))
        if not kind:
            missing.append(f"{brand} {v['model_name']} (brand not mapped)")
            continue
        root = (a.cars if kind == "car" else a.bikes) / folder
        models = {m.name: m for m in root.iterdir() if m.is_dir()} if root.is_dir() else {}
        if v["slug"] in ALIASES:
            name = ALIASES[v["slug"]]
        else:
            key = norm(v["model_name"])
            name = next((n for n in models if norm(n) == key), None)
        if not name or name not in models:
            missing.append(f"{brand} {v['model_name']}")
            continue
        files = [p for p in models[name].iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
        picked = car_order(files) if kind == "car" else bike_order(files)
        if picked:
            manifest[v["slug"]] = {
                "vehicleId": v["id"],
                "name": f"{brand} {v['model_name']}",
                "photos": [{"path": stored(p, kind, folder, name), "label": label(p.name)} for p in picked],
            }
        else:
            missing.append(f"{brand} {v['model_name']} (empty folder)")

    OUT.write_text(json.dumps(manifest, indent=1, ensure_ascii=False), encoding="utf-8")
    total = sum(len(m["photos"]) for m in manifest.values())
    print(f"Wrote {OUT.name}: {len(manifest)} of {len(vehicles)} vehicles, {total} photos.")
    if missing:
        print(f"No local photos for {len(missing)}:")
        for m in missing:
            print("  -", m)


if __name__ == "__main__":
    main()
