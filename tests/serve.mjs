// Local static server that applies dist/_headers (so CSP is tested as shipped). Port via PORT env.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const dist = process.env.DIST || join(fileURLToPath(new URL("..", import.meta.url)), "dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json", ".json": "application/json" };
const globalHeaders = {};
let cur = null;
for (const line of readFileSync(join(dist, "_headers"), "utf8").split("\n")) {
  if (!line.trim()) continue;
  if (!line.startsWith(" ")) { cur = line.trim(); continue; }
  if (cur === "/*") { const i = line.indexOf(":"); globalHeaders[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
}
const mount = (process.env.MOUNT || "").replace(/\/$/, ""); // e.g. /sunrisers-nj-site, to mimic a GitHub Pages project site
const port = Number(process.env.PORT || 4173);
createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let outside = false;
  if (mount) { if (path === mount || path.startsWith(mount + "/")) path = path.slice(mount.length) || "/"; else outside = true; }
  if (path.endsWith("/")) path += "index.html";
  let file = normalize(join(dist, path));
  let status = 200;
  if (outside || !file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) { file = join(dist, "404.html"); status = 404; }
  const type = types[extname(file)] || "application/octet-stream";
  let body = readFileSync(file);
  const headers = { "Content-Type": type, ...globalHeaders };
  // compress text like GitHub Pages does, so lab numbers match what visitors get
  if (/^(text\/|application\/(xml|json|manifest)|image\/svg)/.test(type) && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
    body = gzipSync(body);
    headers["Content-Encoding"] = "gzip";
    headers.Vary = "Accept-Encoding";
  }
  res.writeHead(status, headers);
  res.end(body);
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}`));
