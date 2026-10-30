# report.py OUT_DIR : writes README.md summarising the normalised Maruti data
import json, os, sys

out = sys.argv[1]
index = json.load(open(os.path.join(out, "index.json")))
lakh = lambda p: f"{p / 100000:.2f}" if p else "—"


def spec(v, *keys):
    # Arena and Nexa label the same fields differently, so search every category.
    for k in keys:
        for group in v["specifications"].values():
            for name, val in group.items():
                if name.startswith(k):
                    return " ".join(str(val).replace("|", "/").split())
    return "—"


fetched = json.load(open(os.path.join(out, index[0]["slug"] + ".json")))["fetched_on"]
lines = [
    "# Maruti Suzuki catalogue (official data)",
    "",
    f"Collected on {fetched} from the official Maruti Suzuki sites (marutisuzuki.com for Arena,",
    "nexaexperience.com for Nexa). Prices are **ex-showroom, Surat (Gujarat)**, in ₹ lakh.",
    "Each `<model>.json` file has every variant with Surat prices by paint type, full",
    "technical specifications, the feature list by category, colours (with hex codes) and",
    "the official brochure link.",
    "",
    "**Images:** `reference_image` links point to Maruti Suzuki's own pictures. They are for",
    "reference only — publish them on our site only with permission from Maruti Suzuki or a",
    "dealer, or use our own/licensed photos.",
    "",
    "Ignis no longer has a page on nexaexperience.com (it redirects to the home page), so it",
    "is treated as discontinued and is not included.",
    "",
    "## Summary",
    "",
    "| # | Model | Showroom | Variants | Colours | Fuel | Transmission | Ex-showroom Surat (₹ lakh) |",
    "|---|---|---|---|---|---|---|---|",
]
for i, m in enumerate(index, 1):
    lines.append(f"| {i} | {m['model']} | {m['channel']} | {m['variants']} | {m['colours']} | {', '.join(m['fuel_types'])} | {', '.join(m['transmissions'])} | {lakh(m['ex_showroom_min'])} – {lakh(m['ex_showroom_max'])} |")

for m in index:
    d = json.load(open(os.path.join(out, m["slug"] + ".json")))
    lines += [
        "",
        f"## {d['model']} ({d['channel']})",
        "",
        f"[Official page]({d['official_page']}) · [Brochure (PDF)]({d['brochure_pdf']}) · data: `{d['slug']}.json`",
        "",
        "| Variant | Fuel | Gearbox | Engine | Power | Mileage / EV range | Airbags | Price (₹ lakh) | Dual-tone (₹ lakh) |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for v in d["variants"]:
        p = v["ex_showroom_surat"]
        base = p.get("metallic") or p.get("non_metallic") or (min(p.values()) if p else None)
        lines.append(
            f"| {v['name']} | {v['fuel'] or '—'} | {spec(v, 'Transmission Type')} | {spec(v, 'Capacity (cc)', 'Displacement', 'Battery Capacity')} | "
            f"{spec(v, 'Max Power')} | {spec(v, 'Fuel Efficiency', 'Fuel-Efficiency', 'Range', 'Driving Range')} | {v['airbags'] or '—'} | {lakh(base)} | {lakh(p.get('dual_tone'))} |"
        )
    lines += ["", "Colours: " + ", ".join(c["name"] for c in d["colours"])]

open(os.path.join(out, "README.md"), "w").write("\n".join(lines) + "\n")
print("README.md written,", len(lines), "lines")
