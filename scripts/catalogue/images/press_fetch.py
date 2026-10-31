"""Download the photos attached to official press releases / media pages.

usage: python3 -I press_fetch.py JOBS.tsv OUTDIR
JOBS.tsv lines: <vehicle-slug>\t<press page URL>[\t<extra page URL> ...]
Each image is saved as OUTDIR/<slug>/NN.<ext>, and OUTDIR/<slug>/sources.json maps
file -> {image URL, press page URL}, so every published photo keeps its source.
"""
import json, os, re, subprocess, sys
from urllib.parse import urljoin

jobs, out = sys.argv[1], sys.argv[2]
IMG = re.compile(r'(?:src|href|data-src|srcset)="([^"]+?\.(?:jpe?g|png|webp)(?:\?[^"\s]*)?)', re.I)
SKIP = re.compile(r"logo|icon|favicon|sprite|social|facebook|twitter|instagram|youtube|linkedin|whatsapp|banner-desktop|press-release-(desktop|mobile)", re.I)


def get(url, dest=None):
    cmd = ["curl", "-sL", "--max-time", "90", "-A", "Mozilla/5.0", url]
    if dest:
        cmd += ["-o", dest]
        subprocess.run(cmd, check=False)
        return None
    return subprocess.run(cmd, capture_output=True, check=False).stdout.decode("utf-8", "ignore")


for line in open(jobs):
    if not line.strip() or line.startswith("#"):
        continue
    slug, *pages = line.rstrip("\n").split("\t")
    d = os.path.join(out, slug)
    os.makedirs(d, exist_ok=True)
    sources, seen, n = {}, set(), 0
    for page in pages:
        html = get(page)
        for raw in IMG.findall(html):
            url = urljoin(page, raw.split(" ")[0].replace("&amp;", "&"))
            key = url.split("?")[0]
            if key in seen or SKIP.search(key):
                continue
            seen.add(key)
            n += 1
            ext = os.path.splitext(key)[1].lower() or ".jpg"
            name = f"{n:02d}{ext}"
            get(url, os.path.join(d, name))
            if os.path.getsize(os.path.join(d, name)) < 15000:  # thumbnails, spacers, error pages
                os.remove(os.path.join(d, name))
                continue
            sources[name] = {"image": url, "page": page}
    json.dump(sources, open(os.path.join(d, "sources.json"), "w"), indent=1)
    print(slug, len(sources))
