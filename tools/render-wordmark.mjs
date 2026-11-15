// Rasterise the traced wordmark (cream) at 2x for the OG image. Run by tools/trace-wordmark.py.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const svg = readFileSync("src/assets/img/brand/wordmark.svg", "utf8").replace("<svg", '<svg style="width:100%;display:block;color:#f6f1ea"');
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1600, height: 1032 } });
await p.setContent(`<body style="margin:0;background:transparent"><div style="width:1600px">${svg}</div>`);
await p.screenshot({ path: "brand-src/wordmark-traced-2x.png", omitBackground: true });
await b.close();
