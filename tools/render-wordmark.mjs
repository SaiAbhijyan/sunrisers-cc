// Rasterise the traced wordmark (cream) at 2x for the OG image. Run by tools/trace-wordmark.py.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const svg = readFileSync("src/assets/img/brand/wordmark.svg", "utf8").replace("<svg", '<svg style="width:100%;display:block;color:#f6f1ea"');
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const [vw, vh] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number);
const p = await b.newPage({ viewport: { width: 1600, height: Math.round((1600 * vh) / vw) } });
await p.setContent(`<body style="margin:0;background:transparent"><div style="width:1600px">${svg}</div>`);
await p.screenshot({ path: "media/brand/wordmark-traced-2x.png", omitBackground: true });
await b.close();
