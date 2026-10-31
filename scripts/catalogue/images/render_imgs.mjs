// render_imgs.mjs URL... : opens each page in headless Chromium, scrolls it, and prints
// the large images it displays (naturalWidth >= 600) as "pageURL<TAB>imageURL".
import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium", proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const page = await browser.newPage({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36", viewport: { width: 1440, height: 1600 } });
for (const url of process.argv.slice(2)) {
  try {
    await page.goto(url, { waitUntil: "load", timeout: 90000 });
    for (let y = 0; y < 8; y++) { await page.mouse.wheel(0, 1400); await page.waitForTimeout(500); }
    const imgs = await page.evaluate(() => [...document.images].filter((i) => i.naturalWidth >= 600).map((i) => i.currentSrc || i.src));
    for (const src of [...new Set(imgs)]) console.log(`${url}\t${src}`);
  } catch (e) {
    console.error(`${url}\tERROR ${e.message.slice(0, 80)}`);
  }
}
await browser.close();
