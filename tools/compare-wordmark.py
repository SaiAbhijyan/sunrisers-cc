#!/usr/bin/env python3
"""Overlay check: supplied alpha (halo and all) vs the traced vector. Writes shots/brand/wordmark-compare-*.png.
Grey = both, green = only in the original (its soft halo or detail the trace dropped), magenta = only in the trace."""
import pathlib, sys, numpy as np
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from wordmark_src import R, compose
ref = Image.fromarray(compose(1))
tr = Image.open(R/"brand-src/wordmark-traced-2x.png").convert("RGBA").split()[3].resize(ref.size, Image.LANCZOS)
a = np.array(ref) > 128; b = np.array(tr) > 128
print("IoU", round((a & b).sum()/(a | b).sum(), 4))
def on_dark(m, col=(246,241,234)):
    o = np.zeros(m.shape+(3,), "uint8"); o[...] = (20,12,10); o[m] = col; return Image.fromarray(o)
ov = np.zeros(a.shape+(3,), "uint8"); ov[...] = (20,12,10)
ov[a & b] = (150,150,150); ov[a & ~b] = (60,220,90); ov[~a & b] = (230,60,200)
ra = np.array(ref).astype(float)/255; o = np.zeros(a.shape+(3,), "uint8"); o[...] = (20,12,10)
o = (o*(1-ra[...,None]) + np.array((246,241,234))*ra[...,None]).astype("uint8")
panels = [Image.fromarray(o), on_dark(b), Image.fromarray(ov)]
W = sum(p.width for p in panels)+20*2; sheet = Image.new("RGB", (W, ref.height), (0,0,0)); x = 0
for p in panels: sheet.paste(p, (x, 0)); x += p.width+20
out = R/"shots/brand"; out.mkdir(parents=True, exist_ok=True)
sheet.save(out/"wordmark-compare-original-vs-traced-vs-overlay.png")
def zoom(box, z, name):
    cs = [p.crop(box).resize(((box[2]-box[0])*z, (box[3]-box[1])*z), Image.LANCZOS if i<2 else Image.NEAREST) for i, p in enumerate(panels[:2])]
    Image.fromarray(np.vstack([np.array(c) for c in cs])).save(out/name)
zoom((0,0,400,240), 3, "wordmark-zoom-original-vs-traced.png")
zoom((120,225,520,422), 3, "wordmark-zoom-bottom-original-vs-traced.png")

# layout check against the home reference: reference crop scaled so SUNRISERS is the same width as ours
rf = Image.open(R/"brand-src/home-reference.png").convert("RGB").crop((236,138,598,332))
rf = rf.resize((round(rf.width*786/347), round(rf.height*786/347)), Image.LANCZOS)
lock = panels[1]
sheet2 = Image.new("RGB", (rf.width+lock.width+20, max(rf.height, lock.height)), (0,0,0)); sheet2.paste(rf,(0,0)); sheet2.paste(lock,(rf.width+20,0))
sheet2.save(out/"wordmark-layout-reference-vs-traced.png")
