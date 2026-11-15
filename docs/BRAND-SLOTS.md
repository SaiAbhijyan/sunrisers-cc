# Brand assets: where Sunrisers' own artwork lives

Everything brand-specific is isolated so it can be swapped without touching layout.

| Slot | File / place | What to do |
|---|---|---|
| Colours | `src/css/tokens.css`, block "BRAND SLOT 1" (`--ink`, `--sun`, `--flare`, `--paper`, `--on-*`) | Replace values only. Keep the names. Keep text/background pairs at 4.5:1 (7:1 for small text on black). Run `npm test` (axe) after. |
| Fonts | `src/css/tokens.css` "BRAND SLOT 2" plus `@font-face` at the top of `src/css/site.css`; font files in `src/assets/fonts/` | Self-host new woff2 files (no Google Fonts links: the CSP blocks them). Update the preload in `src/partials/layout.html`. |
| Logo, wordmark, texture | `brand-src/` (originals: `logo-phoenix.png`, `wordmark.png`, `texture.png`, `home-reference.png`; `logo-with-text.png` is an overlapping composite and is not used) | Run `python3 tools/build-brand.py`. It writes avif/webp/png (opaque textures: avif/webp/jpg) into `src/assets/img/brand/`, plus favicon, app icons and the 1200x630 OG image. The texture is recoloured to the reference by histogram matching. |
| Hero art | `.hero` block in `src/pages/index.html` (`picture.hero__tex` + centred `h1.hero__mark` wordmark) and `.hero*` / `.phero::before` / `.band--tex` / `.foot` in `site.css` | Re-run `tools/build-brand.py` after replacing a file in `brand-src/`. Accent tokens (`--sun`, `--sun-deep`) were sampled from `home-reference.png`; keep them at 4.5:1. |
| Photography | every `.slot` (labelled "Placeholder") in `src/pages/*.html` | Replace the slot `div` with `<img>` (width/height set, descriptive alt, `loading="lazy"` below the fold). Add the image origin to nothing: keep images self-hosted so `img-src 'self'` holds. |
| Sponsor logos | `.sponsor-slot` in `src/pages/sponsors.html` and `index.html` | Replace with SVG/PNG logos plus links, with sponsor permission. |
| Copy | `src/data/club.json` (squads, league names, results) and `src/pages/*.html` | Placeholders are marked with the "Placeholder" tag. Remove the tag when real copy lands. |
| Domain | `SITE_URL` in `build.mjs` | Set before launch (canonical, sitemap, robots). |
| Contact endpoint | `data-endpoint` on `#contact-form` in `src/partials/form.html` | Point at a form backend; then add its origin to `connect-src` in `build.mjs` (`CSP`). Until then the form validates but sends nothing. |
