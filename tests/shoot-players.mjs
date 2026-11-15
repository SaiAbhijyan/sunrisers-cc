// Screenshots of the squad pages: leaders, player cards, a no-stats card (desktop + mobile).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.env.BASE || "http://127.0.0.1:4174";
mkdirSync("shots", { recursive: true });
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
for (const [name, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  await p.goto(base + "/teams.html");
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(1800);
  for (const [id, label] of [["fall-t20-frontier", "squad1"], ["mcl-fall-t20-challenger", "squad2"], ["mcl-f40-div-b", "squad3"]]) {
    const sec = p.locator(`#team-${id}`);
    await sec.scrollIntoViewIfNeeded();
    await p.evaluate((i) => document.getElementById("team-" + i).scrollIntoView(), id);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `shots/teams-${name}-${label}-top.png` });
    await p.evaluate((i) => document.getElementById("players-" + i).scrollIntoView(), id);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `shots/teams-${name}-${label}-players.png` });
  }
  await p.locator("#team-fall-t20-frontier .pcard", { hasText: "Andrew V" }).scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `shots/teams-${name}-no-stats-card.png` });
  await ctx.close();
}
await b.close();
