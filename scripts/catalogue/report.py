# report.py OUT_DIR : writes README.md summarising the normalised Maruti data
import json, os, sys

out = sys.argv[1]
# optional INTRO.md in OUT_DIR holds brand-specific notes for the top of the README
intro_file = os.path.join(out, "INTRO.md")
intro = open(intro_file).read().rstrip("\n").split("\n") if os.path.exists(intro_file) else []
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


first = json.load(open(os.path.join(out, index[0]["slug"] + ".json")))
fetched, brand = first["fetched_on"], first["brand"]
lines = [
    f"# {brand} catalogue (official data)",
    "",
    f"Collected on {fetched}. Prices are **ex-showroom, Surat (Gujarat)**, in ₹ lakh.",
    "",
    *intro,
    "",
    "## Summary",
    "",
    "| # | Model | Showroom / type | Variants | Colours | Fuel | Transmission | Ex-showroom Surat (₹ lakh) |",
    "|---|---|---|---|---|---|---|---|",
]
for i, m in enumerate(index, 1):
    lines.append(f"| {i} | {m['model']} | {m['channel']} | {m['variants']} | {m['colours']} | {', '.join(m['fuel_types'])} | {', '.join(m['transmissions'])} | {lakh(m['ex_showroom_min'])} – {lakh(m['ex_showroom_max'])} |")

for m in index:
    d = json.load(open(os.path.join(out, m["slug"] + ".json")))
    lines += [
        "",
        f"## {d['model']}" + (f" ({d['channel']})" if d.get("channel") else ""),
        "",
        f"[Official page]({d['official_page']}) · [Brochure (PDF)]({d['brochure_pdf']}) · data: `{d['slug']}.json`",
        "",
        "| Variant | Fuel | Gearbox | Engine | Power | Mileage / EV range | Airbags | Price (₹ lakh) | Dual-tone (₹ lakh) |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for v in d["variants"]:
        p = v["ex_showroom_surat"]
        base = p.get("metallic") or p.get("non_metallic") or p.get("standard") or (min(p.values()) if p else None)
        lines.append(
            f"| {v['name']} | {v['fuel'] or '—'} | {v['transmission'] if v.get('transmission') not in (None, 'Manual', 'Automatic') else spec(v, 'Transmission Type', 'Type')} | {spec(v, 'Capacity (cc)', 'Displacement', 'Battery Capacity', 'Capacity (kWh)')} | "
            f"{spec(v, 'Max Power', 'Max. Power', 'Max power')} | {spec(v, 'Fuel Efficiency', 'Fuel-Efficiency', 'Range', 'Driving Range', 'Driving range')} | {v.get('airbags') or '—'} | {lakh(base)} | {lakh(p.get('dual_tone'))} |"
        )
    lines += ["", "Colours: " + ", ".join(c["name"] for c in d["colours"])]
    if d.get("brochure_specs"):
        lines += ["", "Brochure specs:"] + [f"- {x}" for x in d["brochure_specs"]]
    lines += [f"\n> Note: {n}" for n in d.get("notes") or []]

open(os.path.join(out, "README.md"), "w").write("\n".join(lines) + "\n")
print("README.md written,", len(lines), "lines")
