# html_tables.py FILE.html [--summary] : extracts every <table> as rows of cell text (JSON),
# or with --summary prints one line per table (row count + first two rows).
import html, json, re, sys
from html.parser import HTMLParser


class Tables(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables, self.stack = [], []

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.stack.append({"rows": [], "row": None, "cell": None, "id": dict(attrs).get("id") or dict(attrs).get("class")})
        elif self.stack:
            t = self.stack[-1]
            if tag == "tr":
                t["row"] = []
            elif tag in ("td", "th"):
                t["cell"] = []
            elif tag == "br" and t["cell"] is not None:
                t["cell"].append(" ")

    def handle_endtag(self, tag):
        if not self.stack:
            return
        t = self.stack[-1]
        if tag in ("td", "th") and t["cell"] is not None and t["row"] is not None:
            t["row"].append(re.sub(r"\s+", " ", "".join(t["cell"])).strip())
            t["cell"] = None
        elif tag == "tr" and t["row"] is not None:
            if any(t["row"]):
                t["rows"].append(t["row"])
            t["row"] = None
        elif tag == "table":
            self.tables.append({"id": t["id"], "rows": t["rows"]})
            self.stack.pop()

    def handle_data(self, data):
        if self.stack and self.stack[-1]["cell"] is not None:
            self.stack[-1]["cell"].append(data)


def tables(path):
    p = Tables()
    p.feed(open(path, encoding="utf-8", errors="replace").read())
    return p.tables


if __name__ == "__main__":
    ts = tables(sys.argv[1])
    if "--summary" in sys.argv:
        for i, t in enumerate(ts):
            print(i, t["id"], len(t["rows"]), " || ".join(" | ".join(r)[:90] for r in t["rows"][:2]))
    else:
        print(json.dumps(ts, ensure_ascii=False))
