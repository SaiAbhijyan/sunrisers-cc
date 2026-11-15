#!/usr/bin/env python3
"""Trace brand-src/wordmark.png (the supplied Milkstore 02 lettering) into a crisp one-colour SVG.

The PNG has a soft halo baked into its alpha channel. We upscale the alpha 4x (Lanczos), blur by 2px to
round off pixel steps, cut it at 50 percent alpha (that is where the halo ends and the letter edge is),
then trace with potrace (smooth curves) and optimise with svgo.  Output: src/assets/img/brand/wordmark.svg
(fill currentColor, viewBox 0 0 800 516) and brand-src/wordmark-traced-2x.png (cream, for the OG image).
Needs potrace (JS) which is NOT a devDependency (it pulls in vulnerable jimp): run `npm i --no-save potrace` first.
Usage: python3 tools/trace-wordmark.py
"""
import subprocess, tempfile, pathlib
import numpy as np
from PIL import Image, ImageFilter

R = pathlib.Path(__file__).resolve().parent.parent
al = Image.open(R / "brand-src/wordmark.png").convert("RGBA").split()[3]
S = 4
big = al.resize((al.width * S, al.height * S), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2))
bw = np.where(np.array(big) > 128, 0, 255).astype("uint8")
with tempfile.TemporaryDirectory() as t:
    p = pathlib.Path(t) / "bw.png"
    Image.fromarray(bw).save(p)
    subprocess.run(["node", str(R / "tools/trace-wordmark.mjs"), str(p), str(R / "src/assets/img/brand/wordmark.svg"), "0.4", "12"], check=True, cwd=R)
subprocess.run(["node", str(R / "tools/render-wordmark.mjs")], check=True, cwd=R)
