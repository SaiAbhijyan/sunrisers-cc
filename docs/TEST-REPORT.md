# Test report (final run, 14 Nov 2026)

Run from `/workspace/sunrisers-nj-site`. Server: `node tests/serve.mjs` (applies the shipped `_headers`, so the CSP is the real one).

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | 12 pages, 0 errors, 0 warnings (the builder throws on any unresolved token) |
| HTML validation | `npx html-validate dist/*.html` | 0 errors |
| Dependency audit | `npm audit` | 0 vulnerabilities (dev dependencies only; the shipped site has zero runtime dependencies) |
| Playwright (Chrome) | `npx playwright test` | 109 passed, 1 skipped (mobile-menu test is mobile-only), 0 failed. 11 pages plus 404 x desktop 1440 and mobile 390 |
| Axe (WCAG 2.0 to 2.2 A/AA plus best practice) | inside Playwright | 0 violations on every page, both viewports |
| Lighthouse 12 pages x mobile and desktop | `tests/lighthouse-all.sh`, summary in `docs/lighthouse/SUMMARY.md` | Performance, Accessibility, Best Practices, SEO all 100 on all 22 runs (11 pages x mobile and desktop). Mobile LCP 1.1 s (simulated throttling), CLS 0 to 0.002, TBT 0 to 20 ms. Localhost run over HTTP; the 404 page cannot be scored (Lighthouse fails any non-200). |
| Hallmark sloplint --render | see HALLMARK_PICKS.md | Rendered scan clean. Floor gate 19 (no dash in copy) is satisfied, which is why squad names use a colon, not the dash in the brief. Static file scan only flags 404.html, which cannot see the shared stylesheet |
| Impeccable detect (URL scan) | `impeccable detect --viewport ...` | 0 findings after fixes |

Playwright covers: console errors, page errors, failed requests, HTTP >= 400, CSP violations, horizontal overflow, broken images, one h1 and title per page, internal links and anchors resolve, every external link has `target=_blank` and `rel=noopener noreferrer`, JavaScript-disabled rendering, navigation to every page (desktop bar and mobile menu), mobile menu open/Escape/focus return/inert, the 404 status and styling, contact and join form validation (empty, bad email, bad phone, short message, success), the honeypot and minimum-time traps, and a static scan that shipped HTML/JS has no inline script, inline handler, inline style, HTML injection API, eval, iframe or third-party origin.

## Not tested, or limits
- External links to cricclubs.com are not crawled in CI and could not be opened: CricClubs sits behind a Cloudflare bot check (not bypassed). League page links are unverified.
- Only Chrome was tested. No Safari/Firefox/real-device run.
- The contact form is not connected to any inbox (no backend, no email known). Server-side validation, rate limiting and spam checks must be added when an endpoint is chosen; the honeypot and dwell-time trap are client-side only.
- No screen-reader session (VoiceOver/NVDA). Axe plus keyboard-focus tests only.
- Security headers are shipped as `dist/_headers` (Netlify/Cloudflare Pages format). The host must apply them; `frame-ancestors` and HSTS cannot be set from a meta tag.

Added content tests: no leftover Standard Athletic / play-cricket / Paris text, the three team links match exactly, every result card links to cricclubs.com.


## Run of 14 Nov 2026 (evening): animations, results selector, player stats
| Check | Result |
|---|---|
| html-validate dist | 0 errors |
| Playwright (Chrome, desktop 1440 and mobile 390) | 172 passed, 2 skipped (mobile-menu test is mobile-only), 0 failed |
| Axe | 0 violations on every page, both viewports |
| npm audit --audit-level=low | 0 vulnerabilities |
| Impeccable detect (index, fixtures, teams, about, contact at 1440x900 and 390x844) | 0 findings |
| Lighthouse (11 pages x mobile and desktop) | 100 / 100 / 100 / 100 everywhere except teams-mobile: performance 97 (TBT 100 ms; 74 player cards), LCP 2.0 s, CLS 0. See docs/lighthouse/SUMMARY.md |
| Hallmark sloplint (source) | only 404.html: gates 26a, 34, 26b (known false positive, it cannot see the shared stylesheet) |
| Hallmark sloplint --render | no gate 19, 10a or 26 findings. Remaining: gate 58 words per screen (FAIL on data-heavy pages: results, squads, home), gate 79 empty space under page heroes (REFLEX), gate 77 thin sections, gate 25 note width. Not fixed: they come from real data volume and the pre-brand layout, which the brand update will change |

Bugs found and fixed in this run: unique ids for player cards across squads (the same person is in several squads), reveal sweep for fast scrolling (elements flicked past were left hidden), mobile hero sun kept animating under reduced motion, width transition on result cards (now transform), a dash character in empty stat cells (now "n/a"), the CricClubs word "Null" shown as a role.

New tests: parallax and reduced motion; player cards (counts 29, 25, 20; every value of all 74 players against the saved CricClubs tables; no-stats state; profile links; flags; computed leaders; sort; "Null"; source note; no-JS).
