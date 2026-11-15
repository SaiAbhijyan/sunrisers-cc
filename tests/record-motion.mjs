import { chromium } from "@playwright/test";
const base = "http://127.0.0.1:4173";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(label, vp, mobile) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, recordVideo: { dir: "video/raw-" + label, size: mobile ? { width: 390, height: 844 } : vp } });
  const p = await ctx.newPage();
  const glide = async (to, step = 14, ms = 16) => {
    let y = await p.evaluate(() => scrollY);
    while (Math.abs(y - to) > step) { y += Math.sign(to - y) * step; await p.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y); await sleep(ms); }
  };
  const shot = (n) => p.screenshot({ path: `shots/motion/${label}-${n}.png` });
  await p.goto(base + "/index.html"); await sleep(600); await shot("01-home-load-0600ms"); await sleep(2200); await shot("02-home-hero-settled");
  const H = await p.evaluate(() => document.body.scrollHeight);
  await glide(500); await shot("03-home-scroll-500-hero-parallax");
  await glide(1100); await sleep(500); await shot("04-home-scroll-1100-results-reveal");
  await glide(Math.round(H * 0.5)); await sleep(500); await shot("05-home-mid");
  await glide(H); await sleep(600); await shot("06-home-footer-wordmark");
  await p.goto(base + "/teams.html"); await sleep(800); await glide(900); await sleep(300); await shot("07-teams-stats-countup-mid");
  await sleep(1500); await shot("08-teams-stats-final");
  await glide(2600); await sleep(800);
  await p.goto(base + "/fixtures.html"); await sleep(800); await glide(700); await sleep(900); await shot("09-fixtures-sticky-bar");
  await p.selectOption("#league-select", "mcl-fall-t20-challenger"); await sleep(100); await shot("10-fixtures-swap-fadeout"); await sleep(1400); await shot("11-fixtures-swapped");
  await p.selectOption("#league-select", "all"); await sleep(1500);
  await ctx.close();
}
await run("desktop", { width: 1280, height: 720 }, false);
await run("mobile", { width: 390, height: 844 }, true);
await b.close();
