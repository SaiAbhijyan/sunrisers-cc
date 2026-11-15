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


## Run of 14 Nov 2026 (night): brand update, squads league selector, league heading highlight
| Check | Result |
|---|---|
| html-validate dist | 0 errors |
| Playwright (Chrome, desktop 1440 and mobile 390), root build | 219 passed, 5 skipped (touch-only skips: hover and arrow-key tests on mobile; mobile-menu test on desktop), 0 failed |
| Playwright under a GitHub Pages style subpath mount (subpath build) | 219 passed, 5 skipped, 0 failed |
| Axe | 0 violations on every page, both viewports (new `--sun` / `--sun-deep` tokens included) |
| npm audit --audit-level=low | 0 vulnerabilities |
| Impeccable detect (index, fixtures, teams, about, contact at 1440x900 and 390x844) | 0 findings |
| Lighthouse (11 pages x mobile and desktop) | Accessibility, Best Practices, SEO 100 everywhere. Performance 99 to 100 (contact-mobile 99, index-mobile 99), CLS 0 to 0.002, mobile LCP 1.7 to 2.0 s. The local test server now gzips text like GitHub Pages does; before that teams-mobile scored 88 to 92 only because the 200 KB HTML was sent uncompressed |
| Hallmark sloplint (source) | only 404.html: gates 26a, 34, 26b (false positive, it cannot see the shared stylesheet). Colour literals were lifted into tokens (`--veil-*`, `--glow-*`) |
| Hallmark sloplint --render | gate 44b fixed (home CTA now inside the 1280x800 fold). Remaining: gate 58 words per screen on data-heavy pages, gate 59 section gap (hero to ticker strip is 18px by design) |

New tests: squads league selector (options, All shows 3 squads and 74 cards, each league shows only its squad with leaders and stats, `?league=` deep link and revealed cards, `#team-` hash, unknown league, sort inside a squad, keyboard, no JavaScript); league headings on results and squads (all three styled alike, hover turns each orange and releases, keyboard focus does the same, no transition under reduced motion); the three "on CricClubs" rows identical with a slide-in orange fill; brand assets (phoenix and wordmark loaded, alt text, hero preload and fetchpriority, lazy footer logo, favicon / apple icon / manifest / og:image resolve, AA contrast of the accent tokens); parallax and reduced motion on the new hero texture.

Bugs found and fixed in this run: reduced-motion rule for `.lh` and `.leaguelink` was overridden by later rules (transitions still ran); squads status text said "all 74 squads"; the player-card reveal did one forced layout per card (now batched); the local server lacked avif/jpg/webmanifest types and gzip.

Honest notes: the opaque textures use a jpg fallback (not png) because they have no transparency; `logo-with-text.png` is not used (an overlapping composite of the phoenix and wordmark, both supplied separately); the wordmark source is 800px wide so it is slightly soft on high-density screens.


## Run of 15 Nov 2026 (after midnight): traced vector wordmark
The hero wordmark is now the supplied Milkstore 02 lettering traced to one crisp SVG path (no glow, blur or filter), inlined with `fill: currentColor` in the cream token; the OG image uses the same vector. The earlier Barlow Condensed SVG text and its font file were removed. Traced shapes overlap the supplied PNG at 98.3 percent (pixel XOR 1.7 percent of the lettering area at a 50 percent alpha cut); tests: one flat path, no text, image or filter, same viewBox, no computed filter or shadow, load entrance without blur, reduced motion still, and an overlap test (IoU above 0.95) against `brand-src/wordmark.png`. See the final run below for totals.
