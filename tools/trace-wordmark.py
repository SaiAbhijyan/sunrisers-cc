#!/usr/bin/env python3
"""Trace the supplied Milkstore 02 lettering into one crisp, flat, one-colour SVG (the hero and OG wordmark).

Sources (hand-cleaned by Sai: flat cream, hard alpha edges, no halo; see tools/wordmark_src.py for the layout):
  brand-src/wordmark-sunrisers-est-clean.png    EST. 2017 + SUNRISERS
  brand-src/wordmark-cricket-club-nj-clean.png  CRICKET CLUB + arched NEW JERSEY USA
Steps: compose both onto one alpha canvas (Lanczos upscale straight to 8x the final size), blur ~0.5 px to round off the
pixel steps, cut at 50 percent alpha, trace with potrace (smooth curves, corners kept), optimise with svgo.
Output: src/assets/img/brand/wordmark.svg (fill currentColor, viewBox 0 0 800 422) and brand-src/wordmark-traced-2x.png
(cream, for the OG image).
Needs potrace (JS) which is NOT a devDependency (it pulls in vulnerable jimp): run `npm i --no-save potrace` first.
Usage: python3 tools/trace-wordmark.py
"""
import subprocess, tempfile, pathlib, sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from wordmark_src import R, W, H, compose

S = 8
THR = 128
big = Image.fromarray(compose(S)).filter(ImageFilter.GaussianBlur(3.5))
bw = np.where(np.array(big) > THR, 0, 255).astype("uint8")
with tempfile.TemporaryDirectory() as t:
    p = pathlib.Path(t) / "bw.png"
    Image.fromarray(bw).save(p)
    subprocess.run(["node", str(R / "tools/trace-wordmark.mjs"), str(p), str(R / "src/assets/img/brand/wordmark.svg"), "1", "60", str(S), "0.9", str(W), str(H)], check=True, cwd=R)
subprocess.run(["node", str(R / "tools/render-wordmark.mjs")], check=True, cwd=R)
