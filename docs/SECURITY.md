# Security notes
- CSP (meta tag in every page and `dist/_headers`): `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'` plus `frame-ancestors 'none'` in headers. No `unsafe-inline`, no `unsafe-eval`. Consequence: no inline scripts or `style=""` attributes anywhere; the build and tests enforce this.
- No third-party scripts, fonts, analytics, cookies, embeds or maps. Fonts are self-hosted (OFL). The map is a link out.
- External links: the build adds `target="_blank" rel="noopener noreferrer"` and a screen-reader "(opens in a new tab)" hint to every absolute URL.
- JS never writes HTML: dynamic text uses `textContent` only. Form payloads are JSON-encoded, never concatenated into markup.
- Contact form: client-side validation, hidden honeypot field, 2.5 s minimum dwell time, length limits, no data stored or sent until an endpoint is configured.
- Other headers: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (camera, mic, geolocation, payment off), `Cross-Origin-Opener-Policy`, HSTS.
- Secrets: none in the repo. No personal names, emails or phone numbers are published; contact details are placeholders.
- Dependencies: dev-only (Playwright, axe, html-validate, Lighthouse, fontsource). `npm audit`: 0 vulnerabilities at build time.
