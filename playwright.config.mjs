import { defineConfig } from "@playwright/test";
// Local: server on :4174. BASE_PATH mounts it under a subpath. SITE_ORIGIN points the suite at a live site instead.
const origin = process.env.SITE_ORIGIN || "http://127.0.0.1:4174";
const basePath = (process.env.BASE_PATH || "").replace(/\/$/, "");
export default defineConfig({
  testDir: "tests",
  testMatch: /.*\.spec\.mjs/,
  timeout: 45000,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "tests/results.json" }]],
  use: { baseURL: origin + basePath + "/", channel: undefined, launchOptions: { executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] } },
  webServer: process.env.SITE_ORIGIN ? undefined : { command: `PORT=4174 MOUNT=${basePath} node tests/serve.mjs`, url: origin + basePath + "/index.html", reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
});
