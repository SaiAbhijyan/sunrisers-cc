# Brand originals

Sunrisers logo, wordmark, foil texture and the home-page reference live here. These files are the source of truth; do not overwrite them with compressed derivatives.

`python3 tools/build-brand.py` reads this folder and writes the website files to `src/assets/img/brand/` (favicon, phoenix sizes, texture, OG image). `python3 tools/trace-wordmark.py` traces the two cleaned wordmark halves into `src/assets/img/brand/wordmark.svg`.

| File | What it is |
|---|---|
| `logo-phoenix.png` | Phoenix mark |
| `logo-with-text.png` | Composite of logo and lettering (not used on the site) |
| `wordmark-sunrisers-est-clean.png` | Hand-cleaned EST. 2017 + SUNRISERS lettering |
| `wordmark-cricket-club-nj-clean.png` | Hand-cleaned CRICKET CLUB + arched NEW JERSEY USA lettering |
| `wordmark-sunrisers-est.png`, `wordmark-cricket-club-nj.png`, `wordmark.png` | Earlier versions, kept as history |
| `wordmark-traced-2x.png` | Raster of the traced SVG, used for the OG card |
| `texture.png`, `texture-recoloured.png` | Foil texture, original and recoloured |
| `home-reference.png` | Layout and colour reference for the home wordmark |
