# hyundai_brochure.py : reads the "Key features" trim matrix and colours from a Hyundai India
# brochure converted with `pdftotext -layout`.
import re

MARKS = {"S": True, "●": True, "O": "optional", "○": "optional", "-": False, "–": False, "NA": False}
SECTIONS = ("safety", "exterior", "interior", "comfort", "convenience", "infotainment", "seating",
            "technology", "wheels", "connectivity", "adas", "smartsense", "lighting", "audio", "instrument",
            "bluelink", "climate", "utility", "performance", "dimensions", "engine")
COLOUR_WORDS = r"(?:White|Black|Grey|Gray|Red|Blue|Silver|Bronze|Green|Khaki|Night|Pearl|Teal|Gold|Lime|Olive|Orange|Beige|Brown|Yellow|Titanium|Emerald|Copper|Maroon|Purple)"
COLOUR_RE = re.compile(
    rf"\b((?:[A-Z][a-z]+ ){{0,3}}{COLOUR_WORDS}(?: (?:Matte|Pearl|Metallic))?"
    rf"(?: with (?:[A-Z][a-z]+ ){{0,2}}{COLOUR_WORDS}(?: [Rr]oof)?)?)")


def mark(tok):
    """'S#', 'S*' and similar footnoted cells count as the plain mark."""
    return MARKS.get(re.sub(r"[#*^$@~\u2020\u2021\u00b9\u00b2\u00b3]+$", "", tok))


def trailing_marks(line, n):
    toks = line.split()
    if len(toks) < n:
        return None, None
    tail = [mark(t) for t in toks[-n:]]
    if any(t is None for t in tail):
        return None, None
    # the token before the marks must not be another mark (row has exactly n columns)
    if len(toks) > n and mark(toks[-n - 1]) is not None:
        return None, None
    # the label ends where the first of the last n tokens starts
    pos = len(line.rstrip())
    for tok in reversed(toks[-n:]):
        pos = line.rfind(tok, 0, pos)
    return line[:pos], tail


def is_group_label(line):
    s = line.strip()
    return (bool(s) and len(s) < 60 and not re.search(r"\s{3,}", s) and line[:1] != " "
            and not re.search(r"\d", s) and not any(s.lower().startswith(k) for k in SECTIONS))


def features(text, trims):
    """Return {trim: {section: [feature, ...]}} for standard (True) and optional features."""
    n = len(trims)
    out = {t: {} for t in trims}
    lines = text.split("\n")
    section, group = "General", ""
    started = False
    for i, line in enumerate(lines):
        s = line.strip()
        if not s:
            continue
        if re.match(r"(?i)^key features\b", s):
            started = True
            continue
        if not started:
            continue
        label, marks = trailing_marks(line, n)
        if marks is None:
            low = s.lower()
            if len(s) < 40 and any(low.startswith(k) for k in SECTIONS) and len(s.split()) <= 4:
                section, group = s.rstrip(":"), ""
            elif is_group_label(line):
                group = s  # a group label on its own line (e.g. "Airbag")
            continue
        parts = [p.strip() for p in re.split(r"\s{3,}", label.strip()) if p.strip()]
        lead = len(label) - len(label.lstrip())
        if len(parts) >= 2:
            group, name = parts[0], " \u2013 ".join(parts)
        elif parts and lead >= 15:
            # an indented sub-row; its group label may sit on the next line instead of the previous one
            nxt = next((l for l in lines[i + 1:i + 3] if l.strip()), "")
            prev_label = next((l for l in reversed(lines[max(0, i - 2):i]) if l.strip()), "")
            if not group or (is_group_label(nxt) and not is_group_label(prev_label) and trailing_marks(prev_label, n)[0] is None):
                if is_group_label(nxt):
                    group = nxt.strip()
            name = f"{group} \u2013 {parts[0]}" if group else parts[0]
        elif parts:
            name, group = parts[0], parts[0]
        else:
            continue
        name = re.sub(r"\s+", " ", name).strip(" -\u2013")
        if section.lower().startswith(("engine", "dimensions", "performance")):
            continue
        for trim, m in zip(trims, marks):
            if m:
                out[trim].setdefault(section, []).append(name + (" (optional)" if m == "optional" else ""))
    return out


PAINT = (r"(?:white|black|gr[ae]y|red|blue|silver|bronze|green|khaki|night|pearl|teal|gold|lime|olive|orange|"
         r"beige|brown|yellow|emerald|sapphire|copper|maroon)")
CELL_RE = re.compile(rf"(?i)^((?:[a-z]+ ){{1,2}}{PAINT}(?: (?:matte|pearl))?)(?: with ((?:[a-z]+ ){{0,1}}{PAINT}) roof| with)?$")
NOT_PAINT = {"all", "dual", "piano", "glossy", "gloss", "chrome", "dark", "light", "brass", "interior", "with",
             "and", "in", "the", "black", "matte", "body", "painted", "satin", "silver", "metal", "red", "sporty",
             "exclusive", "insert", "inserts", "moon", "brushed", "seat", "leather", "leatherette", "grey", "beige", "navy", "and"}


def colours(text):
    """Exterior paint names, read from brochure cells such as 'Atlas white with black roof'."""
    found = []
    lines = text.split("\n")
    for i, line in enumerate(lines):
        for cell in re.split(r"\s{3,}|\|", line.strip()):
            cell = re.sub(r"\s+", " ", cell).strip(" .,")
            m = CELL_RE.match(cell)
            if not m or m.group(1).split()[0].lower() in NOT_PAINT:
                continue
            base = m.group(1)
            if m.group(2):
                name = f"{base} with {m.group(2)} roof"
            elif cell.lower().endswith(" with"):
                name = f"{base} with black roof"  # wrapped onto the next line in the brochure
            else:
                name = base
            name = name[0].upper() + name[1:].lower()
            if name not in found:
                found.append(name)
    return found
