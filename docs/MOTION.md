# Motion (scroll animation) notes
Principles: motion shows structure, never hides content. Everything is progressive enhancement. Only transform, translate, rotate, scale, opacity and clip-path animate, so layout never shifts (CLS 0).

- Reduced motion: `@media (prefers-reduced-motion: no-preference)` wraps every animation in CSS and `motion.js` returns early. With reduced motion, or without JavaScript, all content is simply there.
- Tools: native CSS scroll-driven animations (`animation-timeline: scroll()` and `view()`, behind `@supports`), cross-document view transitions, IntersectionObserver reveals, requestAnimationFrame count-ups. No animation library, nothing third-party, strict CSP kept (no inline styles; JS sets styles through the CSSOM only).
- Fallbacks: browsers without scroll timelines get an IntersectionObserver reveal for headings and a scroll-progress bar driven from JS. A scroll sweep reveals anything a fast flick skipped.

| Where | Effect |
|---|---|
| Every page | Orange scroll-progress bar under the masthead. Page-to-page view transition with a stable masthead. Press and hover states on buttons and cards. |
| Home | Rising sun drifts and grows, slashed bars turn as you scroll, headline lifts and fades, sky eases in. Big headings wipe in. Match cards, squad cards and stat cells stagger in. Season numbers count up. Ticker slides. |
| Inner pages | Smaller sun parallax in the page header, wiping headings, staggered cards and rows. |
| Squads | Season numbers count up to the exact values, squad leaders and each player card reveal in sequence, the sort control reorders cards. |
| Results | The league selector is sticky under the masthead. Changing league fades the old list out and staggers the new cards in. |
| Footer | The wordmark slides into place. |
