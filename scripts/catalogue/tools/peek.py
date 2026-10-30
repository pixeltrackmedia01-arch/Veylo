# peek.py FILE.json [MAX_LINES]
# Prints the *shape* of a JSON file (keys, list lengths, one sample per list, values cut to
# 60 chars) so a feed can be understood without dumping it. Default 60 lines.
import json, sys

path = sys.argv[1]
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 60
lines = []


def walk(o, pad=""):
    if len(lines) >= limit:
        return
    if isinstance(o, dict):
        for k, v in o.items():
            if isinstance(v, (dict, list)):
                lines.append(f"{pad}{k}: {'[%d]' % len(v) if isinstance(v, list) else '{}'}")
                walk(v, pad + "  ")
            elif v not in (None, "", [], {}):
                lines.append(f"{pad}{k}: {str(v)[:60]}")
            if len(lines) >= limit:
                return
    elif isinstance(o, list) and o:
        walk(o[0], pad)


walk(json.load(open(path)))
print("\n".join(lines[:limit]))
