"""Flag photo files that look copied from car portals before anything is processed.

usage: python3 -I source_check.py LISTING.json   (Drive search_files JSON: {"files":[{"title":..}]} or a list)
Prints counts and exits 1 when portal-style names dominate. Portal photos (CarDekho,
CarWale, BikeDekho, BikeWale, ZigWheels) are their own copyright and must not be used.
"""
import json, re, sys

d = json.load(open(sys.argv[1]))
files = d["files"] if isinstance(d, dict) else d
names = [f.get("title") or f.get("name") or "" for f in files if "folder" not in f.get("mimeType", "")]
PORTAL = [
    re.compile(r"^[a-z0-9()&-]+-\d{1,3}\.(jpe?g|png|webp|avif)$", re.I),  # steering-wheel-54.jpg
    re.compile(r"^[A-Z0-9-]+_[0-9a-f]{3,6}\.(jpe?g|png|webp|avif)$"),     # STEALTH-BLACK_080808.avif
    re.compile(r"cardekho|carwale|bikedekho|bikewale|zigwheels|stimg|imgd\.aeplcdn", re.I),
]
hits = [n for n in names if any(p.search(n) for p in PORTAL)]
print(f"{len(names)} images, {len(hits)} with car-portal naming")
for n in hits[:8]:
    print("  ", n)
sys.exit(1 if names and len(hits) / len(names) > 0.2 else 0)
