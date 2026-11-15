#!/usr/bin/env python3
"""Build the optimised brand images from brand-src/ (originals are kept untouched).
- texture.png: crop the white strip (top) and orange bar (bottom), recolour to the home reference's red-orange
  by histogram-matching the texture's brightness to colours sampled from home-reference.png.
- hero texture is a mirrored pair (mirror seam sits behind the centred wordmark) so it fills a wide screen.
- phoenix / wordmark: responsive sizes as avif + webp + png.  Icons, OG image, manifest icons from the phoenix.
Usage: python3 tools/build-brand.py
"""
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from pathlib import Path

root = Path(__file__).resolve().parent.parent
S = root / "brand-src"
O = root / "src/assets/img/brand"
O.mkdir(parents=True, exist_ok=True)

def save3(im, name, q=(45, 72), png=False, jpg=None):
    """avif + webp + (png or jpg) fallback."""
    im.save(O / f"{name}.avif", quality=q[0], speed=6)
    im.save(O / f"{name}.webp", quality=q[1], method=6)
    if png: im.save(O / f"{name}.png", optimize=True)
    if jpg: im.convert("RGB").save(O / f"{name}.jpg", quality=jpg, optimize=True, progressive=True)

# ---- 1. sample the reference ----
ref = np.array(Image.open(S / "home-reference.png").convert("RGB")).astype(np.float32)
h, w, _ = ref.shape
m = np.ones((h, w), bool); m[:60, :] = False; m[130:320, 230:600] = False  # drop header + wordmark
rpx = ref[m]; rv = rpx.max(1)
order = np.argsort(rv); rpx = rpx[order]; rv = rv[order]
n = len(rv)
print("reference mean of brightest 5%:", rpx[int(n * .95):].mean(0).round())

# ---- 2. texture: crop + recolour ----
t = Image.open(S / "texture.png").convert("RGBA")
ta = np.array(t)
x0, x1, y0, y1 = 8, 586, 30, 774   # inside the transparent margin, below the white strip, above the orange bar
crop = ta[y0:y1, x0:x1, :3].astype(np.float32)
assert (ta[y0:y1, x0:x1, 3] == 255).all(), "crop still touches transparent pixels"
v = crop.max(2)
hist, _ = np.histogram(v, bins=256, range=(0, 256))
cdf = np.cumsum(hist) / hist.sum()
lut = np.zeros((256, 3), np.float32)
for b in range(256):
    q = min(max(cdf[b], 0.002), 0.998)
    lo, hi = int(max(q - 0.004, 0) * n), int(min(q + 0.004, 1) * n)
    lut[b] = rpx[lo:max(hi, lo + 1)].mean(0)
out = lut[v.astype(np.uint8)]
tex = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
tex.save(S / "texture-recoloured.png", optimize=True)
print("recoloured texture", tex.size, "bright:", np.array(tex).reshape(-1, 3)[np.argsort(v.ravel())[-5000:]].mean(0).round())

def scaled(im, s): return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
def crop_c(im, W, H):
    l, tp = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((l, tp, l + W, tp + H))

# wide: one big, softly upscaled crop (no mirroring, which reads as a face); fine grain hides the upscale
def grain(im, amt=7, seed=3):
    rng = np.random.default_rng(seed)
    a = np.array(im).astype(np.float32)
    a += rng.normal(0, amt, a.shape[:2])[..., None] * (a.max(2, keepdims=True) / 255.0 * 0.9 + 0.1)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
big = tex.resize((1920, round(tex.height * 1920 / tex.width)), Image.LANCZOS)
top = int(big.height * 0.30)
wide = grain(big.crop((0, top, 1920, top + 1080)).filter(ImageFilter.UnsharpMask(2, 60, 2)))
save3(wide, "tex-wide", q=(40, 66), jpg=68)
save3(wide.resize((1280, 720), Image.LANCZOS), "tex-wide-1280", q=(40, 66), jpg=68)
tall = grain(tex.resize((780, round(tex.height * 780 / tex.width)), Image.LANCZOS), 6, 5)
save3(tall, "tex-tall", q=(40, 66), jpg=68)
# band texture (used behind sections, always under a dark overlay): small and light
save3(wide.resize((960, 540), Image.LANCZOS), "tex-band", q=(35, 60), jpg=62)

# ---- 3. phoenix ----
ph = Image.open(S / "logo-phoenix.png").convert("RGBA")
bbox = ph.getbbox(); ph = ph.crop(bbox)
def fit(im, W=None, H=None):
    s = (W / im.width) if W else (H / im.height)
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
for W in (96, 192, 384):
    save3(fit(ph, W), f"phoenix-{W}", png=True)
print("phoenix aspect", ph.width / ph.height)

# ---- 4. wordmark ----
wm = Image.open(S / "wordmark.png").convert("RGBA"); wm = wm.crop(wm.getbbox())
print("wordmark", wm.size, "aspect", wm.width / wm.height)
save3(wm, "wordmark-800", png=True)
save3(fit(wm, 480), "wordmark-480", png=True)

# ---- 5. icons on a dark ground (maskable-safe padding) ----
def icon(size, pad=0.14, bg=(18, 8, 4)):
    base = Image.new("RGB", (size, size), bg)
    p = fit(ph, H=int(size * (1 - 2 * pad)))
    base.paste(p, ((size - p.width) // 2, (size - p.height) // 2), p)
    return base
for s, n in ((180, "apple-touch-icon"), (192, "icon-192"), (512, "icon-512")):
    icon(s).save(O / f"{n}.png", optimize=True)
fav = Image.new("RGBA", (64, 64), (0, 0, 0, 0)); f = fit(ph, H=60); fav.paste(f, ((64 - f.width) // 2, 2), f)
fav.resize((32, 32), Image.LANCZOS).save(O / "favicon-32.png", optimize=True)
fav.save(O / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# ---- 6. Open Graph image 1200x630 ----
og = grain(tex.resize((1500, round(tex.height * 1500 / tex.width)), Image.LANCZOS).crop((150, 500, 1350, 1130)), 6, 9)
shade = Image.new("RGBA", (1200, 630), (0, 0, 0, 0)); d = ImageDraw.Draw(shade)
for x in range(1200):  # darken the left third so the wordmark reads
    d.line([(x, 0), (x, 630)], fill=(0, 0, 0, int(150 * (1 - x / 1200) + 40)))
og = Image.alpha_composite(og.convert("RGBA"), shade)
pp = fit(ph, H=470); og.alpha_composite(pp, (70, 80))
ww = fit(wm, W=560); og.alpha_composite(ww, (560, (630 - ww.height) // 2))
og.convert("RGB").save(O / "og-image.jpg", quality=84, optimize=True, progressive=True)
for p in sorted(O.iterdir()): print(f"{p.name:32s}{p.stat().st_size/1024:8.1f} KB")
