import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const pages = readdirSync(dist).filter((f) => f.endsWith(".html") && f !== "404.html");
const ROOT = (process.env.SITE_ORIGIN || "http://127.0.0.1:4174") + (process.env.BASE_PATH || "") + "/";
const BASEPATH = process.env.BASE_PATH || "";
const nav = ["about", "teams", "fixtures", "news", "events", "gallery", "sponsors", "ground", "contact"];

for (const file of pages) {
  test.describe(file, () => {
    test("loads clean: no console errors, no failed requests, no CSP violations, no overflow, images load", async ({ page }) => {
      const problems = [];
      page.on("console", (m) => ["error", "warning"].includes(m.type()) && problems.push(`console ${m.type()}: ${m.text()}`));
      page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
      page.on("requestfailed", (r) => problems.push(`requestfailed: ${r.url()}`));
      page.on("response", (r) => r.status() >= 400 && problems.push(`http ${r.status()}: ${r.url()}`));
      await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => console.error("CSP violation " + e.violatedDirective + " " + e.blockedURI)));
      const res = await page.goto("" + file, { waitUntil: "networkidle" });
      expect(res.status()).toBe(200);
      expect(res.headers()["content-security-policy"]).toContain("script-src 'self'");
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(/Sunrisers/);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "horizontal overflow px").toBeLessThanOrEqual(0);
      const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
      expect(broken).toEqual([]);
      expect(problems).toEqual([]);
    });

    test("internal links resolve and external links are safe", async ({ page }) => {
      await page.goto("" + file);
      const links = await page.$$eval("a[href]", (as) => as.map((a) => ({ href: a.getAttribute("href"), target: a.target, rel: a.rel })));
      for (const l of links) {
        if (/^https?:\/\//.test(l.href)) {
          expect(l.rel, l.href).toContain("noopener");
          expect(l.target, l.href).toBe("_blank");
        } else if (!l.href.startsWith("#") && !l.href.startsWith("mailto:")) {
          const [pathq, hash] = l.href.split("#");
          const path = pathq.split("?")[0].replace(BASEPATH, "");
          expect(existsSync(join(dist, path)), `missing ${l.href}`).toBe(true);
          if (hash) expect(readFileSync(join(dist, path), "utf8")).toContain(`id="${hash}"`);
        }
      }
    });

    test("axe: no WCAG A/AA violations", async ({ page }) => {
      await page.goto("" + file, { waitUntil: "networkidle" });
      await page.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-in")));
      await page.waitForTimeout(1500);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });

    test("works with JavaScript disabled (content visible, nav usable)", async ({ browser }) => {
      const ctx = await browser.newContext({ javaScriptEnabled: false });
      const page = await ctx.newPage();
      await page.goto(ROOT + file);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator('a[href="join.html"]').first()).toBeVisible();
      await ctx.close();
    });
  });
}

test("site navigation reaches every page", async ({ page, isMobile }) => {
  await page.goto("index.html");
  for (const n of nav.concat(["join"])) {
    if (isMobile) {
      await page.click(".menu-toggle");
      await expect(page.locator(".menu-toggle")).toHaveAttribute("aria-expanded", "true");
    }
    await page.locator(`#site-nav a[href="${n}.html"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${n}\\.html$`));
    await expect(page.locator("h1")).toBeVisible();
    if (n !== "join") await expect(page.locator('#site-nav a[aria-current="page"]')).toHaveCount(1);
  }
});

test("mobile menu: opens, Escape closes and returns focus, closed menu is inert", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.goto("index.html");
  await expect(page.locator("#site-nav")).toHaveAttribute("inert", "");
  await page.click(".menu-toggle");
  await expect(page.locator("#site-nav")).not.toHaveAttribute("inert", "");
  await page.waitForTimeout(400);
  const box = await page.locator("#site-nav").boundingBox();
  expect(box.height, "open menu covers the screen below the bar").toBeGreaterThan(600);
  expect(await page.locator("#site-nav .nav__link").last().isVisible()).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(".menu-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".menu-toggle")).toBeFocused();
});

test("404 page is served with status 404 and working assets", async ({ page }) => {
  const res = await page.goto("definitely/not/here");
  expect(res.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("404");
  const font = await page.evaluate(() => getComputedStyle(document.querySelector("h1")).fontFamily);
  expect(font).toContain("Big Shoulders");
});

test.describe("contact form", () => {
  for (const url of ["contact.html", "join.html"]) {
    test(`validation, honeypot and success on ${url}`, async ({ page }) => {
      await page.goto(url);
      const form = page.locator("#contact-form");
      await form.getByRole("button", { name: "Send message" }).click();
      await expect(page.locator("#f-first-err")).toHaveText(/first name/i);
      await expect(page.locator("#f-email-err")).toContainText("email");
      await expect(page.locator("#f-topic-err")).toContainText("Choose");
      await expect(page.locator("#form-status")).toHaveAttribute("data-state", "error");
      await expect(page.locator("#f-first")).toBeFocused();
      await page.fill("#f-first", "Test");
      await page.fill("#f-last", "Player");
      await page.fill("#f-email", "not-an-email");
      await page.fill("#f-phone", "abc");
      await page.selectOption("#f-topic", "Joining the team");
      await page.fill("#f-msg", "short");
      await form.getByRole("button", { name: "Send message" }).click();
      await expect(page.locator("#f-email-err")).toContainText("name@example.com");
      await expect(page.locator("#f-phone-err")).toContainText("digits");
      await expect(page.locator("#f-msg-err")).toContainText("10 characters");
      await page.fill("#f-email", "test@example.com");
      await page.fill("#f-phone", "+1 201 555 0100");
      await page.fill("#f-msg", "I would like to try cricket, adult beginner.");
      await page.waitForTimeout(2600);
      await form.getByRole("button", { name: "Send message" }).click();
      await expect(page.locator("#form-status")).toHaveAttribute("data-state", "ok");
      await expect(page.locator("#form-status")).toContainText("not connected");
    });
    test(`honeypot is invisible and trapped submissions are not sent on ${url}`, async ({ page }) => {
      await page.goto(url);
      const reqs = [];
      page.on("request", (r) => r.method() === "POST" && reqs.push(r.url()));
      await page.evaluate(() => document.getElementById("contact-form").setAttribute("data-endpoint", "/api/never"));
      const box = await page.locator(".hp").boundingBox();
      expect(box.x + box.width).toBeLessThan(0);
      await page.fill("#f-first", "Bot");
      await page.fill("#f-last", "Bot");
      await page.fill("#f-email", "bot@example.com");
      await page.selectOption("#f-topic", "Something else");
      await page.fill("#f-msg", "Buy cheap watches now please.");
      await page.evaluate(() => (document.getElementById("f-site").value = "http://spam.example"));
      await page.getByRole("button", { name: "Send message" }).click();
      await expect(page.locator("#form-status")).toHaveAttribute("data-state", "ok");
      expect(reqs).toEqual([]);
    });
  }
});

test("security: no inline scripts, handlers, innerHTML or third-party origins in shipped code", async () => {
  for (const f of pages.concat(["404.html"])) {
    const html = readFileSync(join(dist, f), "utf8");
    expect(html, f).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(html, f).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html, f).not.toMatch(/\sstyle\s*=/i);
    expect(html, f).not.toMatch(/(src|href)="http:\/\//);
    expect(html, f).not.toMatch(/<(iframe|object|embed)/i);
    expect(html, f).toContain("Content-Security-Policy");
  }
  for (const f of readdirSync(join(dist, "js"))) {
    const js = readFileSync(join(dist, "js", f), "utf8");
    expect(js, f).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/);
  }
  const css = readFileSync(join(dist, "css/site.css"), "utf8");
  expect(css).not.toMatch(/url\(["']?https?:/);
});

test("content: no leftover Standard Athletic / play-cricket / Paris content", async () => {
  const banned = /Standard Athletic|play-cricket|13754|Meudon|Paris|Burkule|YouTube|facebook\.com|Touring XI|Under 19|1st XI|Pav[ée] de/i;
  for (const f of pages.concat(["404.html"])) {
    expect(readFileSync(join(dist, f), "utf8"), f).not.toMatch(banned);
  }
});

test("content: the three CricClubs team links are present exactly as supplied", async () => {
  const html = readFileSync(join(dist, "teams.html"), "utf8");
  for (const u of [
    "https://cricclubs.com/viewTeam.do?&amp;teamId=907&amp;league=43&amp;clubId=49",
    "https://cricclubs.com/viewTeam.do?&amp;teamId=1974&amp;league=136&amp;clubId=21870",
    "https://cricclubs.com/viewTeam.do?&amp;teamId=1950&amp;league=132&amp;clubId=21870",
  ]) expect(html).toContain(u);
});

test("content: home shows the last match of each league, one per squad, labelled and linked to its scorecard", async ({ page }) => {
  await page.goto("index.html");
  const cards = page.locator(".scores > li");
  await expect(cards).toHaveCount(3);
  const expected = [
    ["Fall T20 Frontier", "Quarter Final", "Buyrite Phoenix", "https://cricclubs.com/CLNJ/viewScorecard.do?matchId=5300&clubId=49", "Sun, Oct 25, 2026"],
    ["MCL Fall T20 Challenger", "Quarter Final", "Incredibles", "https://cricclubs.com/MillenniumForty40/viewScorecard.do?matchId=9046&clubId=21870", "Sat, Oct 17, 2026"],
    ["MCL F40 Div B", "Semi Final", "Drona Stormers", "https://cricclubs.com/MillenniumForty40/viewScorecard.do?matchId=8915&clubId=21870", "Sat, Aug 29, 2026"],
  ];
  for (let i = 0; i < 3; i++) {
    const [league, stage, opp, href, date] = expected[i];
    const c = cards.nth(i);
    await expect(c.locator(".score__squad")).toHaveText(league);
    await expect(c).toContainText(stage);
    await expect(c).toContainText(opp);
    await expect(c).toContainText(date);
    expect(await c.locator("a.score__link").evaluate((a) => a.href)).toBe(href);
  }
  await expect(page.locator("main")).toContainText("Last updated 14 Nov 2026 from CricClubs.");
});

test("content: results page lists all 31 matches with stage, scores, overs; abandoned and forfeits show no 0/0", async ({ page }) => {
  await page.goto("fixtures.html");
  const cards = page.locator(".scores > li");
  await expect(cards).toHaveCount(31);
  await expect(page.locator("main")).toContainText("Last updated 14 Nov 2026 from CricClubs.");
  const hrefs = await page.$$eval(".scores .score__link", (a) => a.map((x) => x.href));
  for (const h of hrefs) expect(h).toMatch(/^https:\/\/cricclubs\.com\/(CLNJ|MillenniumForty40)\/viewScorecard\.do\?matchId=\d+&clubId=(49|21870)$/);
  expect(new Set(hrefs).size).toBe(31);
  const first = cards.first();
  await expect(first).toContainText("Quarter Final");
  await expect(first).toContainText("259/10");
  await expect(first).toContainText("19.4/20 ov");
  await expect(first).toContainText("Buyrite Phoenix won by 148 Runs");
  for (const txt of ["Abandoned", "Forfeited, Winner: Sunrisers Cricket Club"]) {
    const c = page.locator(".scores > li", { hasText: txt }).first();
    await expect(c).toBeVisible();
    await expect(c.locator(".score__runs")).toHaveCount(0);
    expect(await c.innerText()).not.toMatch(/0\/0/);
  }
  await expect(page.locator("main")).not.toContainText("Placeholder");
});

test.describe("league selector on the results page", () => {
  const leagues = [
    ["fall-t20-frontier", /^Fall T20 Frontier/, 8],
    ["mcl-fall-t20-challenger", /^MCL Fall T20 Challenger/, 7],
    ["mcl-f40-div-b", /^MCL F40 Div B/, 16],
  ];
  const visibleIds = (page) => page.$$eval(".league-group:not([hidden])", (g) => g.map((x) => x.dataset.league));

  test("is a labelled native select with All plus each league", async ({ page }) => {
    await page.goto("fixtures.html");
    const sel = page.getByLabel("League");
    await expect(sel).toBeVisible();
    expect(await sel.evaluate((e) => e.tagName)).toBe("SELECT");
    const opts = await sel.locator("option").allTextContents();
    expect(opts).toEqual(["All leagues (31 matches)", "Fall T20 Frontier (8 matches)", "MCL Fall T20 Challenger (7 matches)", "MCL F40 Div B (16 matches)"]);
  });

  test("All shows all 31 matches, grouped by league", async ({ page }) => {
    await page.goto("fixtures.html");
    await expect(page.locator(".scores > li:visible")).toHaveCount(31);
    expect(await visibleIds(page)).toEqual(leagues.map((l) => l[0]));
    await expect(page.locator("#filter-status")).toContainText("all 31 matches");
  });

  for (const [id, name, n] of leagues) {
    test(`selecting ${id} shows only its ${n} matches`, async ({ page }) => {
      await page.goto("fixtures.html");
      await page.getByLabel("League").selectOption(id);
      await expect(page.locator(".scores > li:visible")).toHaveCount(n);
      expect(await visibleIds(page)).toEqual([id]);
      const squadOf = await page.$$eval(".scores > li:visible", (l) => [...new Set(l.map((x) => x.dataset.squad))]);
      expect(squadOf).toEqual([id]);
      await expect(page.locator("#filter-status")).toContainText(`${n} matches in`);
      expect(new URL(page.url()).searchParams.get("league")).toBe(id);
      await page.getByLabel("League").selectOption("all");
      await expect(page.locator(".scores > li:visible")).toHaveCount(31);
      expect(new URL(page.url()).searchParams.get("league")).toBeNull();
    });

    test(`deep link ?league=${id} preselects it`, async ({ page }) => {
      await page.goto(`fixtures.html?league=${id}`);
      await expect(page.getByLabel("League")).toHaveValue(id);
      await expect(page.locator(".scores > li:visible")).toHaveCount(n);
    });
  }

  test("unknown ?league= falls back to All", async ({ page }) => {
    await page.goto("fixtures.html?league=nope");
    await expect(page.getByLabel("League")).toHaveValue("all");
    await expect(page.locator(".scores > li:visible")).toHaveCount(31);
  });

  test("keyboard: select is focusable and arrow keys change the league", async ({ page, isMobile }) => {
    test.skip(isMobile, "native picker on touch");
    await page.goto("fixtures.html");
    await page.getByLabel("League").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(".scores > li:visible")).toHaveCount(8);
  });

  test("no JavaScript: no selector, every match shown, grouped by league", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(ROOT + "fixtures.html?league=mcl-f40-div-b");
    await expect(page.locator("#league-select")).toBeHidden();
    await expect(page.locator(".scores > li:visible")).toHaveCount(31);
    await expect(page.locator(".league-group h3")).toHaveCount(3);
    await ctx.close();
  });

  test("squads page links open the results page on that league", async ({ page }) => {
    await page.goto("teams.html");
    await page.getByRole("link", { name: /All 16 matches for this squad/ }).click();
    await expect(page.getByLabel("League")).toHaveValue("mcl-f40-div-b");
    await expect(page.locator(".scores > li:visible")).toHaveCount(16);
  });
});

test("content: squads page has real names, de-duplicated roster and computed summaries", async ({ page }) => {
  await page.goto("teams.html");
  const headings = await page.$$eval("h2.display-l", (h) => h.map((x) => x.textContent.trim()));
  expect(headings).toEqual(["Sunrisers: Fall T20 Frontier XI", "Sunrisers: MCL Fall T20 Challenger XI", "Sunrisers: MCL F40 Div B XI"]);
  await expect(page.locator("main")).toContainText("Sunrisers Cricket Club");
  await expect(page.locator("main")).toContainText("Novo Sunrisers");
  await expect(page.locator("main")).toContainText("Last updated 14 Nov 2026 from CricClubs.");
  const stats = await page.$$eval("section[id^=team-] .stats", (d) => d.map((x) => [...x.querySelectorAll(".stats__cell dd [data-count]")].map((e) => e.dataset.count)));
  expect(stats).toEqual([["4", "2", "2", "3"], ["6", "3", "3", "1"], ["13", "8", "5", "3"]]);
  await expect(page.locator("#team-fall-t20-frontier")).toContainText("Quarter Final, lost");
  await expect(page.locator("#team-mcl-f40-div-b")).toContainText("Semi Final, lost");
});

test.describe("motion", () => {
  const scrollThrough = async (page) => {
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 350) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); }
    });
    await page.waitForTimeout(1600);
  };

  test("scroll progress bar grows with the page", async ({ page }) => {
    await page.goto("index.html");
    const w = () => page.$eval(".progress", (e) => new DOMMatrix(getComputedStyle(e).transform).a);
    expect(await w()).toBeLessThan(0.05);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    expect(await w()).toBeGreaterThan(0.9);
  });

  test("every revealed element ends fully visible after scrolling, and nothing is left hidden", async ({ page }) => {
    for (const f of ["index.html", "teams.html", "fixtures.html"]) {
      await page.goto(f);
      await scrollThrough(page);
      await expect.poll(() => page.$$eval(".reveal", (els) => els.filter((e) => getComputedStyle(e).opacity !== "1").length), { message: f, timeout: 6000 }).toBe(0);
      expect(await page.$$eval(".reveal:not(.is-in)", (e) => e.filter((x) => !x.closest("[hidden]")).length), f).toBe(0);
    }
  });

  test("season numbers count up and land on the exact values", async ({ page }) => {
    await page.goto("teams.html");
    await page.locator("#team-mcl-f40-div-b .stats").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2200);
    const vals = await page.$$eval("#team-mcl-f40-div-b [data-count]", (e) => e.map((x) => x.textContent));
    expect(vals).toEqual(["13", "8", "5", "3"]);
    // the real value is always available to assistive tech, independent of the animation
    await expect(page.locator("#team-mcl-f40-div-b .stats__cell dd .visually-hidden").first()).toHaveText("13");
    await expect(page.locator("#team-mcl-f40-div-b [data-count]").first()).toHaveAttribute("aria-hidden", "true");
  });

  test("no layout shift while scrolling through the page (CLS under 0.02)", async ({ page }) => {
    for (const f of ["index.html", "teams.html", "fixtures.html"]) {
      await page.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__cls += e.value))).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(f, { waitUntil: "networkidle" });
      await scrollThrough(page);
      expect(await page.evaluate(() => window.__cls), f).toBeLessThan(0.02);
    }
  });

  test("league swap fades out, swaps and leaves a clean state", async ({ page }) => {
    await page.goto("fixtures.html");
    await page.getByLabel("League").selectOption("mcl-f40-div-b");
    await expect(page.locator(".scores > li:visible")).toHaveCount(16);
    await page.waitForTimeout(1500);
    await expect(page.locator("#league-results")).not.toHaveClass(/is-out/);
    await scrollThrough(page);
    expect(await page.$$eval(".league-group:not([hidden]) .scores > li", (l) => l.filter((x) => getComputedStyle(x).opacity !== "1").length)).toBe(0);
  });

  test("reduced motion: nothing is hidden, nothing animates, numbers are final at once", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    for (const f of ["index.html", "teams.html", "fixtures.html"]) {
      await page.goto(ROOT + f);
      expect(await page.$$eval(".reveal", (e) => e.filter((x) => getComputedStyle(x).opacity !== "1" || getComputedStyle(x).translate !== "none").length), f).toBe(0);
      const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && !(a.effect && a.effect.target && a.effect.target.closest(".sun, .hero, .phero"))).length);
      expect(anims, f).toBe(0);
      expect(await page.$eval(".progress", (e) => getComputedStyle(e).animationName)).toBe("none");
    }
    await page.goto(ROOT + "teams.html");
    expect(await page.$$eval("[data-count]", (e) => e.map((x) => x.textContent).join(","))).toBe("4,2,2,3,6,3,3,1,13,8,5,3");
    await page.goto(ROOT + "fixtures.html");
    await page.getByLabel("League").selectOption("fall-t20-frontier");
    await expect(page.locator(".scores > li:visible")).toHaveCount(8); // immediate, no fade timer
    await ctx.close();
  });
});

// ---------- player cards: every value is checked against the saved CricClubs tables ----------
const here = dirname(fileURLToPath(import.meta.url));
function sourceTable(team, kind) {
  const html = readFileSync(join(here, "..", "research", "player-stats", `team${team}-${kind}.html`), "utf8");
  const rows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => c[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim()));
  const urls = [...html.matchAll(/href="([^"]*playerId=\d+[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  return { head: rows[0], rows: rows.slice(1), urls };
}
const squadsMeta = [
  ["fall-t20-frontier", "907", 29],
  ["mcl-fall-t20-challenger", "1974", 25],
  ["mcl-f40-div-b", "1950", 20],
];

test.describe("parallax", () => {
  test("the hero sun moves with scroll, and stays still under reduced motion", async ({ page, browser }) => {
    await page.goto("index.html");
    const tf = () => page.$eval(".sun", (e) => getComputedStyle(e).transform + "|" + getComputedStyle(e).animationName);
    const before = await tf();
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(600);
    const after = await tf();
    expect(after).not.toBe(before);
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const p2 = await ctx.newPage();
    await p2.goto(ROOT + "index.html");
    const a = await p2.$eval(".sun", (e) => getComputedStyle(e).animationName);
    expect(a).toBe("none");
    await ctx.close();
  });
});

test.describe("player cards", () => {
  test("player counts per squad match the CricClubs roster tables", async ({ page }) => {
    await page.goto("teams.html");
    for (const [id, team, n] of squadsMeta) {
      await expect(page.locator(`#team-${id} .pcard`)).toHaveCount(n);
      expect(sourceTable(team, "players").rows.length).toBe(n);
      await expect(page.locator(`#team-${id} .stats__h`).filter({ hasText: `Players, ${n} on the CricClubs roster` })).toHaveCount(1);
    }
  });

  test("a sample player's stats match the source exactly (Venkat Chennamallu, Fall T20 Frontier)", async ({ page }) => {
    await page.goto("teams.html");
    const card = page.locator("#team-fall-t20-frontier .pcard", { hasText: "Venkat Chennamallu" });
    const grid = async (title) => card.locator(".pstat", { hasText: title }).locator(".pstat__cell").evaluateAll((c) => c.map((x) => [x.querySelector("dt abbr").textContent, x.querySelector("dd").textContent]));
    expect(await grid("Batting")).toEqual([["M", "5"], ["Inns", "4"], ["NO", "0"], ["Runs", "114"], ["HS", "50"], ["Avg", "28.50"], ["SR", "131.03"], ["4s", "10"], ["6s", "6"], ["50s", "1"], ["100s", "0"]]);
    await expect(card).toContainText("All Rounder");
    await expect(card).toContainText("Right Handed Batter");
    await expect(card.locator(".pcard__photo")).toBeEmpty();
    await expect(card.locator("img")).toHaveCount(0);
  });

  test("every card shows exactly the values in its source rows (all 74 players, batting, bowling, fielding)", async ({ page }) => {
    await page.goto("teams.html");
    const specs = [
      ["Batting", "batting", ["M", "Inns", "NO", "Runs", "HS", "Avg", "SR", "4s", "6s", "50s", "100s"]],
      ["Bowling", "bowling", ["O", "M", "R", "W", "Best", "Econ", "Avg", "SR"]],
      ["Fielding", "fielding", ["Ct", "WK Ct", "RO direct", "RO indirect", "St"]],
    ];
    let checked = 0;
    for (const [id, team] of squadsMeta) {
      const players = sourceTable(team, "players");
      for (let i = 0; i < players.rows.length; i++) {
        const pid = players.urls[i].match(/playerId=(\d+)/)[1];
        const card = page.locator(`#p-${id}-${pid}`);
        await expect(card).toHaveCount(1);
        await expect(card.locator(".pcard__name")).toHaveText(players.rows[i][0]);
        let any = false;
        for (const [title, kind, labels] of specs) {
          const t = sourceTable(team, kind);
          const row = t.rows[i];
          const vals = row.slice(4);
          const present = labels.map((l, k) => [l, vals[k]]).filter(([, v]) => v !== "");
          const block = card.locator(".pstat", { hasText: title });
          if (!present.length) { await expect(block).toHaveCount(0); continue; }
          any = true;
          const got = await block.locator(".pstat__cell").evaluateAll((c) => c.map((x) => [x.querySelector("dt abbr").textContent, x.querySelector("dd").textContent]));
          expect(got, `${id} ${players.rows[i][0]} ${title}`).toEqual(present.map(([l, v]) => [l, v === "--" ? "n/a" : v]));
        }
        if (!any) await expect(card.locator(".pcard__none")).toHaveText("No stats recorded this season");
        else await expect(card.locator(".pcard__none")).toHaveCount(0);
        checked++;
      }
    }
    expect(checked).toBe(74);
  });

  test("players with no stats rows say so instead of showing zeros", async ({ page }) => {
    await page.goto("teams.html");
    for (const [sq, name] of [["fall-t20-frontier", "Andrew V"], ["fall-t20-frontier", "Varun Katari"], ["mcl-fall-t20-challenger", "Harsh Patel"], ["mcl-f40-div-b", "Ananta Gaikwad"]]) {
      const card = page.locator(`#team-${sq} .pcard`, { hasText: name });
      await expect(card.locator(".pcard__none")).toHaveText("No stats recorded this season");
      await expect(card.locator(".pstat")).toHaveCount(0);
      await expect(card.locator("dd")).toHaveCount(0);
    }
    const n = await page.locator(".pcard__none").count();
    expect(n).toBe(7 + 5 + 2);
  });

  test("profile links go to the CricClubs player page and open safely", async ({ page }) => {
    await page.goto("teams.html");
    const links = await page.$$eval(".pcard .link-arrow", (a) => a.map((x) => ({ h: x.href, t: x.target, r: x.rel })));
    expect(links).toHaveLength(74);
    for (const l of links) {
      expect(l.h).toMatch(/^https:\/\/cricclubs\.com\/(CLNJ|MillenniumForty40)\/viewPlayer\.do\?playerId=\d+&clubId=(49|21870)$/);
      expect(l.t).toBe("_blank");
      expect(l.r).toContain("noopener");
    }
    const sai = page.locator("#team-mcl-f40-div-b .pcard", { hasText: "Sai Abhijyan Tanikella" });
    await expect(sai.locator(".link-arrow")).toHaveAttribute("href", /viewPlayer\.do\?playerId=\d+&clubId=21870/);
  });

  test("captain, vice-captain and wicket-keeper flags come from the roster flags", async ({ page }) => {
    await page.goto("teams.html");
    for (const id of ["fall-t20-frontier", "mcl-fall-t20-challenger", "mcl-f40-div-b"]) {
      await expect(page.locator(`#team-${id} .pcard`, { hasText: "Ronald Rexson" }).locator(".pcard__flags")).toContainText("Captain");
      await expect(page.locator(`#team-${id} .pcard`, { hasText: "Hari Gangula" }).locator(".pcard__flags")).toContainText("Vice-captain");
    }
    await expect(page.locator("#p-fall-t20-frontier-638073 .pcard__flags")).toContainText("Wicket-keeper");
    await expect(page.locator("#team-mcl-fall-t20-challenger .pcard", { hasText: "Madhur Katyal" }).locator(".pcard__flags")).toContainText("Wicket-keeper");
    await expect(page.locator("#p-fall-t20-frontier-256213 .pcard__flags")).toHaveCount(0);
  });

  test("squad leaders are computed from the data", async ({ page }) => {
    await page.goto("teams.html");
    const leaders = async (id) => page.locator(`#team-${id} .leaders__cell`).evaluateAll((c) => c.map((x) => [x.querySelector("dt").textContent, x.querySelector("dd a")?.textContent, x.querySelector(".leaders__n")?.textContent]));
    for (const [id, team] of squadsMeta) {
      const p = sourceTable(team, "players");
      const bat = sourceTable(team, "batting"), bowl = sourceTable(team, "bowling"), fld = sourceTable(team, "fielding");
      const top = (vals) => { const m = Math.max(...vals.filter((v) => v !== null)); return { m, names: p.rows.map((r, i) => (vals[i] === m ? r[0] : null)).filter(Boolean) }; };
      const n = (s) => (s === "" || s === "--" ? null : Number(s));
      const runs = top(bat.rows.map((r) => n(r[7])));
      const wk = top(bowl.rows.map((r) => n(r[7])));
      const ct = top(fld.rows.map((r) => (r[4] === "" ? null : n(r[4]) + n(r[5]))));
      const got = await leaders(id);
      expect(got[0]).toEqual(["Top run scorer", runs.names[0], String(runs.m)]);
      expect(got[1]).toEqual(["Top wicket taker", wk.names[0], String(wk.m)]);
      expect(got[2]).toEqual(["Most catches", ct.names[0], String(ct.m)]);
    }
    expect((await leaders("fall-t20-frontier"))[0]).toEqual(["Top run scorer", "Venkat Chennamallu", "114"]);
  });

  test("sorting reorders the cards by runs, wickets, catches and name", async ({ page }) => {
    await page.goto("teams.html");
    const sel = page.locator("#sort-fall-t20-frontier");
    const first = () => page.locator("#players-list-fall-t20-frontier .pcard .pcard__name").first().textContent();
    await sel.selectOption("runs");
    expect(await first()).toBe("Venkat Chennamallu");
    await sel.selectOption("name");
    expect(await first()).toBe("Abhimanyu Bhardwaj");
    await sel.selectOption("wkts");
    const names = await page.locator("#players-list-fall-t20-frontier .pcard").evaluateAll((c) => c.map((x) => Number(x.dataset.wkts)));
    expect(names).toEqual([...names].sort((a, b) => b - a));
    await sel.selectOption("roster");
    expect(await first()).toBe("Abhimanyu Bhardwaj");
    await expect(page.locator("#sort-mcl-f40-div-b")).toBeVisible();
  });

  test('the CricClubs placeholder word "Null" never shows as a role or style', async ({ page }) => {
    await page.goto("teams.html");
    await expect(page.locator(".pcard", { hasText: /\bNull\b/ })).toHaveCount(0);
    await expect(page.locator("#team-mcl-fall-t20-challenger .pcard", { hasText: "Anil Vellaturi" }).locator(".pcard__role")).toHaveCount(0);
  });

  test("source note and photo-blank state are shown", async ({ page }) => {
    await page.goto("teams.html");
    await expect(page.locator("#team-fall-t20-frontier .note")).toContainText("from CricClubs, 14 Nov 2026");
    await expect(page.locator("#team-fall-t20-frontier .note a")).toHaveCount(3);
    const hrefs = await page.$$eval("#team-fall-t20-frontier .note a", (a) => a.map((x) => x.href));
    expect(hrefs).toEqual([
      "https://cricclubs.com/CLNJ/teamBatting.do?&teamId=907&league=43&clubId=49",
      "https://cricclubs.com/CLNJ/teamBowling.do?&teamId=907&league=43&clubId=49",
      "https://cricclubs.com/CLNJ/teamFielding.do?&teamId=907&league=43&clubId=49",
    ]);
  });

  test("no JavaScript: all cards are visible in roster order and the sort control is hidden", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(ROOT + "teams.html");
    await expect(page.locator(".pcard:visible")).toHaveCount(74);
    await expect(page.locator(".psort").first()).toBeHidden();
    await ctx.close();
  });
});
