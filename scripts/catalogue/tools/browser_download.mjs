// browser_download.mjs PAGE_URL OUTDIR [PATTERN]
// Opens PAGE_URL in Chromium and saves, byte-for-byte, every response whose URL matches PATTERN
// (a regex; default: spreadsheet/PDF files). For files that only download inside the site's
// browser session (e.g. signed or referer-locked storage). Prints the saved file names.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const [pageUrl, out, pattern = "\\.(xlsx?|csv|pdf)(\\?|$)"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const re = new RegExp(pattern, "i");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36" });
const saves = [];
page.on("response", (r) => {
  if (!re.test(r.url())) return;
  saves.push(r.body().then((buf) => {
    const name = decodeURIComponent(r.url().split("?")[0].split("/").pop());
    writeFileSync(`${out}/${name}`, buf);
    console.log(`${name} ${buf.length} ${r.url().slice(0, 140)}`);
  }).catch(() => {}));
});
await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
await page.waitForTimeout(4000);
await Promise.all(saves);
await browser.close();
