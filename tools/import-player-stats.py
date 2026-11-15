#!/usr/bin/env python3
"""Turn research/player-stats/*.html (CricClubs tables saved 2026-11-14) into src/data/players.json.
Only values present in the source are kept; blank cells stay absent. Re-run after refreshing the research tables."""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = root / "research/player-stats"

class T(HTMLParser):
    def __init__(s):
        super().__init__(); s.rows = []; s.cur = None; s.cell = None; s.href = None; s.links = []; s.meta = {}
    def handle_starttag(s, t, a):
        a = dict(a)
        if t == "tr": s.cur = []
        if t in ("td", "th"): s.cell = ""; s.href = None
        if t == "a":
            if s.cell is not None: s.href = a.get("href")
            else: s.links.append(a.get("href"))
    def handle_endtag(s, t):
        if t in ("td", "th") and s.cell is not None:
            s.cur.append((s.cell.strip(), s.href)); s.cell = None
        if t == "tr" and s.cur is not None: s.rows.append(s.cur); s.cur = None
    def handle_data(s, d):
        if s.cell is not None: s.cell += d

def load(name):
    p = T(); p.feed((src / name).read_text())
    head = [c for c, _ in p.rows[0]]
    return head, [[(c, h) for c, h in r] for r in p.rows[1:]], p.links

BAT = ["M", "Inns", "NO", "Runs", "HS", "Avg", "SR", "4s", "6s", "50s", "100s"]
BOWL = ["O", "M", "R", "W", "Best", "Econ", "Avg", "SR"]
FIELD = ["Ct", "WkCt", "RoD", "RoI", "St"]

out = {}
for team in ("907", "1974", "1950"):
    head, prow, links = load(f"team{team}-players.html")
    players = []
    for r in prow:
        cells = [c for c, _ in r]
        url = r[5][1] or cells[5]
        pid = re.search(r"playerId=(\d+)", url).group(1)
        players.append(dict(id=pid, name=cells[0], role=cells[1], batStyle=cells[2], bowlStyle=cells[3], flags=[f for f in re.split(r"[ ,]+", cells[4]) if f], url=url))
    by_id = {p["id"]: p for p in players}
    for kind, keys, fname in (("batting", BAT, "batting"), ("bowling", BOWL, "bowling"), ("fielding", FIELD, "fielding")):
        h, rows, _ = load(f"team{team}-{fname}.html")
        assert len(rows) == len(players), (team, kind, len(rows), len(players))
        for r in rows:
            cells = [c for c, _ in r]
            pid = re.search(r"playerId=(\d+)", r[3][1]).group(1)
            assert by_id[pid]["name"] == cells[0], (team, kind, pid, cells[0])
            vals = cells[4:]
            assert len(vals) == len(keys), (team, kind, len(vals))
            d = {k: v for k, v in zip(keys, vals) if v != ""}
            if d: by_id[pid][kind] = d
    out[team] = players
(root / "src/data/players.json").write_text(json.dumps(dict(_source="research/player-stats/*.html, CricClubs, saved 2026-11-14. Blank source cells are absent.", teams=out), indent=1, ensure_ascii=False))
for t, ps in out.items():
    print(t, len(ps), "bat", sum("batting" in p for p in ps), "bowl", sum("bowling" in p for p in ps), "field", sum("fielding" in p for p in ps), "none", sum(not any(k in p for k in ("batting", "bowling", "fielding")) for p in ps))
