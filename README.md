# Sunrisers (New Jersey, USA): website (preview)

Static site, zero runtime dependencies. Orange-and-black "First Light" design for Sunrisers, a cricket team in New Jersey, USA. Live data sits on CricClubs; the site links to it.

```
npm install        # dev tools only
npm run build      # src/ -> dist/ (12 pages, CSP headers, sitemap)
npm run serve      # http://127.0.0.1:4173 with the real security headers (PORT=... to change)
npx playwright test
npx html-validate dist/*.html
tests/lighthouse-all.sh
```
Layout: `src/pages` (content), `src/partials` (layout, header, footer, form), `src/css/tokens.css` (the only place for colours and fonts), `src/css/site.css`, `src/js`, `src/data/club.json` (squads, CricClubs links, results), `src/data/players.json` (generated from `research/player-stats/` by `tools/import-player-stats.py`), `src/css/motion.css` and `src/js/motion.js` (scroll animation, see `docs/MOTION.md`), `build.mjs`.
See `docs/BRAND-SLOTS.md` (where Kittl assets go), `docs/CONTENT-SOURCES.md`, `docs/SECURITY.md`, `docs/TEST-REPORT.md`, `HALLMARK_PICKS.md`.
Pages: home, about, squads, results, news, events, gallery, sponsors, ground, contact, join, 404.
