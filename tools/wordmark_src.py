"""Shared by trace-wordmark.py and compare-wordmark.py: compose the two supplied wordmark halves into one alpha canvas.

  brand-src/wordmark-sunrisers-est-clean.png     800x230  EST. 2017 + SUNRISERS (hand-cleaned)   placed 1:1 at the top
  brand-src/wordmark-cricket-club-nj-clean.png   800x314  CRICKET / CLUB / arched NEW JERSEY USA (hand-cleaned), placed at BOT_K scale
Layout is taken from brand-src/home-reference.png: CRICKET is 0.32 of the SUNRISERS width and starts a hair under it,
the arch is 0.58 of the SUNRISERS width.  (CRICKET is 423px wide in the supplied file; 250 / 423 = 0.59.)
Keep the constants in sync with the overlap test in tests/site.spec.mjs.
"""
import pathlib
import numpy as np
from PIL import Image

R = pathlib.Path(__file__).resolve().parent.parent
W, H = 800, 422          # lockup canvas = SVG viewBox
BOT_K = 0.59             # scale of the cricket-club file
BOT_X, BOT_Y = 165, 236  # where its top-left lands (centres CRICKET under SUNRISERS, ~6px under the lowest S)

def alpha(name):
    return Image.open(R / "brand-src" / name).convert("RGBA").getchannel("A")

def compose(S=1, resample=Image.LANCZOS):
    """Return the lockup alpha as a uint8 array at S times the 800x422 canvas."""
    top = alpha("wordmark-sunrisers-est-clean.png")
    bot = alpha("wordmark-cricket-club-nj-clean.png")
    out = np.zeros((H * S, W * S), "uint8")
    t = np.array(top.resize((top.width * S, top.height * S), resample))
    out[: t.shape[0]] = t
    bw, bh = round(bot.width * BOT_K * S), round(bot.height * BOT_K * S)
    b = np.array(bot.resize((bw, bh), resample))
    y0, x0 = BOT_Y * S, BOT_X * S
    sl = out[y0 : y0 + bh, x0 : x0 + bw]
    np.maximum(sl, b[: sl.shape[0], : sl.shape[1]], out=sl)
    return out
