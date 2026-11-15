// Screenshots: home hero, squads with selector, results hover/focus state (desktop + mobile).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.env.BASE || "http://127.0.0.1:4173/";
const out = process.env.OUT || "shots/brand";
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
for (const [name, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  await p.goto(base + "index.html", { waitUntil: "networkidle" }); await p.waitForTimeout(2400);
  await p.screenshot({ path: `${out}/home-hero-${name}.png` });
  await p.evaluate(() => window.scrollTo(0, 700)); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/home-scrolled-${name}.png` });
  await p.screenshot({ path: `${out}/home-full-${name}.png`, fullPage: true });
  await p.goto(base + "teams.html?league=mcl-fall-t20-challenger", { waitUntil: "networkidle" }); await p.waitForTimeout(1800);
  await p.screenshot({ path: `${out}/squads-selector-${name}.png` });
  await p.goto(base + "teams.html", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/squads-all-${name}.png` });
  await p.goto(base + "fixtures.html", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector("#league-results").scrollIntoView()); await p.waitForTimeout(2800);
  await p.locator(".league-group__h .lh").nth(1).hover(); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/results-hover-league2-${name}.png` });
  await p.locator(".league-group__h .lh").nth(2).focus(); await p.keyboard.press("Shift+Tab"); await p.keyboard.press("Tab"); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/results-focus-league3-${name}.png` });
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  await p.locator(".leaguelink").nth(2).hover(); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/results-leaguelinks-hover-${name}.png` });
  await ctx.close();
}
await b.close();
