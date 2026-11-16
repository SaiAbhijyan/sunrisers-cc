# Sunrisers (New Jersey, USA): website (preview)

Static site, zero runtime dependencies. Red-orange-and-black design (the club phoenix, wordmark and foil texture) for Sunrisers, a cricket team in New Jersey, USA. Live data sits on CricClubs; the site links to it.

```
npm install        # dev tools only
npm run build      # src/ -> dist/ (12 pages, CSP headers, sitemap)
npm run serve      # http://127.0.0.1:4173 with the real security headers (PORT=... to change)
npx playwright test
npx html-validate dist/*.html
tests/lighthouse-all.sh
```
Layout: `src/pages` (content), `src/partials` (layout, header, footer, form), `src/css/tokens.css` (the only place for colours and fonts), `src/css/site.css`, `src/js`, `src/data/club.json` (squads, CricClubs links, results), `src/data/players.json` (generated from `research/player-stats/` by `tools/import-player-stats.py`), `src/css/motion.css` and `src/js/motion.js` (scroll animation, see `docs/MOTION.md`), `build.mjs`.
Brand art: `media/brand/` (originals) to `src/assets/img/brand/` via `python3 tools/build-brand.py`. See `docs/BRAND-SLOTS.md`, `docs/CONTENT-SOURCES.md`, `docs/SECURITY.md`, `docs/TEST-REPORT.md`, `HALLMARK_PICKS.md`.
Pages: home, about, squads, results, news, events, gallery, sponsors, ground, contact, join, 404.

## Publishing (GitHub Pages)
Live: https://saiabhijyan.github.io/sunrisers-cc/ (branch `gh-pages`, built by `tools/deploy-pages.sh`, which sets `BASE_PATH=/sunrisers-cc` and `SITE_URL`). Pages cannot send headers, so the strict CSP is the meta tag in every page; `dist/_headers` is only used on hosts that support it.
Run the suite under the subpath: `BASE_PATH=/sunrisers-cc npx playwright test` (serves with `MOUNT`). Against the live site: `SITE_ORIGIN=https://saiabhijyan.github.io BASE_PATH=/sunrisers-cc npx playwright test`.
