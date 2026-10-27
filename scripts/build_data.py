#!/usr/bin/env python3
"""Convert on-disk research (blankets/2026-10-23, data/2026-1023) to data/*.json. No invented values."""
import json, re, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = f"{R}/blankets/2026-10-23"; U = f"{R}/data/2026-1023"; OUT = f"{R}/data"
SRC_B = "Kalodata/Hermes"; SRC_U = "Cruva"
def md(p): return open(p, encoding="utf-8").read()
def money(s):
    s = s.replace("$", "").replace(",", "").strip(); m = {"k": 1e3, "m": 1e6}
    try: return round(float(s[:-1]) * m[s[-1].lower()] if s and s[-1].lower() in m else float(s), 2)
    except ValueError: return None
num = money
def tables(text, header_start):
    """rows of the md table whose header begins with header_start, within section text"""
    lines = text.splitlines(); out = []
    for i, l in enumerate(lines):
        if l.startswith("| " + header_start):
            for r in lines[i + 2:]:
                if not r.startswith("|"): break
                out.append([c.strip() for c in r.strip().strip("|").split("|")])
            break
    return out
def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r".*?$(.*?)(?=^## |\Z)", text, re.S | re.M); return m.group(1) if m else ""
def creator(cell):
    m = re.match(r"\[@([^\]]+)\]\(([^)]+)\)", cell)
    if m: return m.group(1), m.group(2)
    vid = cell.strip("`"); return None, None if not vid else None
rank = md(f"{B}/ranking.md"); rx = json.load(open(f"{B}/raw/ranking_extract.json"))
asof_b = rx["provenance"]["data_through"]
rows = []
for r in tables(section(rank, "Product cohort"), "#"):
    rows.append(dict(category="blanket", type="product", window="30d", rank=int(r[0]), name=r[1], creator=None,
        product_id=r[3].strip("`"), gmv=money(r[2]), views=None, units=None, price=None, creators=None,
        posted=None, hook=None, video_url=None, source=SRC_B, as_of=asof_b))
for win, title in (("30d", "Top 20 videos — 30d"), ("7d", "Top 20 videos — 7d")):
    for r in tables(section(rank, title), "#"):
        m = re.match(r"\[@([^\]]+)\]\(([^)]+)\)", r[1]); vid = re.search(r"(\d{15,})", r[1]).group(1)
        rows.append(dict(category="blanket", type="video", window=win, rank=int(r[0]), name=r[2],
            creator=m.group(1) if m else None, video_id=vid,
            video_url=m.group(2) if m else None, gmv=money(r[3]), views=num(r[4]), units=None, price=None,
            creators=None, posted=r[5] or None, hook=r[6] or None, source=SRC_B, as_of=asof_b))
mk = json.load(open(f"{U}/marketplace-umbrella-top.json"))
for p in mk["products"]:
    rows.append(dict(category="umbrella", type="product", window=mk["window"]["label"], rank=p["rank"], name=p["name"],
        creator=None, product_id=p["product_id"], gmv=p.get("gmv"), views=None, units=p.get("units"), price=p.get("price"),
        creators=p.get("creators"), posted=None, hook=None, video_url=None, source=SRC_U, as_of=mk["window"]["to"]))
wn = json.load(open(f"{U}/winners-repel-umbrella.json"))
for w in wn["winners"]:
    rows.append(dict(category="umbrella", type="video (our winners)", window=wn["window"]["label"], rank=w["rank"],
        name=wn["product"]["product_name"], creator=w.get("handle"), video_id=w.get("video_id"), video_url=w.get("video_link"),
        gmv=w.get("gmv"), views=w.get("views"), units=w.get("units_sold"), price=None, creators=None,
        posted=w.get("post_time"), hook=w.get("hook"), source=SRC_U, as_of=wn["window"]["to"]))
# Deconstruct
dec = md(f"{B}/deconstruct.md"); decon = []
for blk in re.split(r"^## (?=\d+\.)", dec, flags=re.M)[1:]:
    head = blk.splitlines()[0]
    m = re.match(r"(\d+)\. @(\S+) — (.+?) — (\$[\d.]+[km]?) · ([\d.]+[km]?)", head)
    url = re.search(r"^(https://\S+)", blk, re.M); beats = {r[0].strip("*"): r[1] for r in tables(blk, "Beat")}
    st = re.search(r"\*\*Steal:\*\*\s*(.+)", blk)
    decon.append(dict(category="blanket", n=int(m.group(1)), creator=m.group(2), product=m.group(3), gmv=money(m.group(4)),
        views=num(m.group(5)), window="30d", format=None, video_url=url.group(1) if url else None,
        hook=beats.get("Hook"), hold=beats.get("Hold"), body=beats.get("Body"), close=beats.get("Close"),
        steal=st.group(1).strip() if st else None, source=SRC_B, as_of=asof_b))
for w in wn["winners"]:
    decon.append(dict(category="umbrella", n=w["rank"], creator=w.get("handle"), product="Repel umbrella (ours)", gmv=w.get("gmv"),
        views=w.get("views"), window="30d", format=w.get("format"), video_url=w.get("video_link"), hook=w.get("hook"),
        hold=None, body=None, close=None, steal=w.get("overview"), source=SRC_U, as_of=wn["window"]["to"]))
# Form trends
trends = []
for r in tables(section(rank, "Form-trends"), "Layer"):
    trends.append(dict(category="blanket", layer=r[0].strip("*"), pattern=r[1], count=int(r[2]), notes=r[3], source=SRC_B,
        basis="top-20 30d videos (n=20), multi-bucket"))
fc = {}
for w in wn["winners"]: fc[w["format"]] = fc.get(w["format"], 0) + 1
for f, c in sorted(fc.items(), key=lambda x: -x[1]):
    trends.append(dict(category="umbrella", layer="Format", pattern=f, count=c, notes=None, source=SRC_U,
        basis=f"Repel our-winners (n={len(wn['winners'])}), format label per video"))
# Steal sheet
ss = md(f"{B}/steal-sheet.md"); recipes = []
for blk in re.split(r"^### ", section(ss, "5 steal recipes"), flags=re.M)[1:]:
    beats = dict(re.findall(r"- \*\*(Hook|Hold|Body|Close):\*\*\s*(.+)", blk))
    recipes.append(dict(title=blk.splitlines()[0].strip(), **{k.lower(): v for k, v in beats.items()}))
steal = dict(blanket=dict(source=SRC_B, as_of=asof_b, brand="CloudFur",
        do_dont=[dict(do=r[0], dont=r[1]) for r in tables(section(ss, "Do this"), "Do")],
        recipes=recipes, checklist=re.findall(r"^\d+\.\s+(.+)$", section(ss, "Daily content checklist"), re.M)),
    umbrella=dict(source=SRC_U, as_of=wn["window"]["to"], brand="Repel", patterns=wn["patterns"],
        prompts=dict(tiktok=wn["prompts"]["tiktok_prompt"], ai_video=wn["prompts"]["ai_video_prompt"]), notes=wn["notes"]))
meta = dict(generated_from=["blankets/2026-10-23/", "data/2026-1023/"],
    as_of=dict(blanket=asof_b, umbrella=wn["window"]["to"]),
    sources=[dict(id="Kalodata/Hermes", status="live", note="Blanket market (Hermes Kalodata browser collection)"),
             dict(id="Cruva", status="live", note="Repel umbrella marketplace + our winners (Cruva MCP)"),
             dict(id="FastMoss", status="coming soon", note="Drop rows into data/fastmoss.json with the same schema")])
for name, obj in [("rankings", rows), ("deconstruct", decon), ("trends", trends), ("steal", steal), ("meta", meta)]:
    json.dump(obj, open(f"{OUT}/{name}.json", "w"), indent=1, ensure_ascii=False)
if not os.path.exists(f"{OUT}/fastmoss.json"):
    json.dump(dict(rankings=[], deconstruct=[], trends=[]), open(f"{OUT}/fastmoss.json", "w"), indent=1)
print(len(rows), len(decon), len(trends), len(recipes))

# Storyboard media (oEmbed thumbnails + real frames via yt-dlp/ffmpeg). Skip with NO_MEDIA=1.
if not os.environ.get("NO_MEDIA"):
    import subprocess, sys; subprocess.run([sys.executable, f"{R}/scripts/build_storyboard.py"], check=True)
