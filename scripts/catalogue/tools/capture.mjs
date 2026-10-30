// capture.mjs URL OUTDIR
// Opens a page in headless Chromium, saves every JSON response it loads (OUTDIR/NNN.json),
// the visible page text (page.txt) and an index, then prints a short list of the
// non-tracking JSON feeds: file, size, URL. Run from the repo root.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const [url, out] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node scripts/catalogue/tools/capture.mjs URL OUTDIR");
  process.exit(1);
}
mkdirSync(out, { recursive: true });
const NOISE = /adobedc|demdex|google|facebook|doubleclick|clarity|hotjar|chat|analytics|tiktok|linkedin|placeholder|form-data|dealer|pincode|login/i;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage({
  userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  viewport: { width: 1440, height: 2000 },
});
const index = [];
let n = 0;
page.on("response", async (r) => {
  if (!(r.headers()["content-type"] || "").includes("json")) return;
  try {
    const body = await r.text();
    const file = `${String(++n).padStart(3, "0")}.json`;
    writeFileSync(`${out}/${file}`, body);
    index.push({ file, size: body.length, url: r.url() });
  } catch {}
});
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(8000);
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(400);
}
writeFileSync(`${out}/page.txt`, await page.evaluate(() => document.body.innerText));
writeFileSync(`${out}/index.json`, JSON.stringify(index, null, 1));
await browser.close();
const seen = new Set();
for (const e of index) {
  const key = e.url.split("?")[0];
  if (NOISE.test(e.url) || seen.has(key)) continue;
  seen.add(key);
  console.log(`${e.file} ${String(e.size).padStart(7)} ${e.url.slice(0, 160)}`);
}
