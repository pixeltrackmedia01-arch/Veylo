// fetch.mjs OUTDIR : Honda Motorcycle & Scooter India — every model's variants with Gujarat
// ex-showroom prices. The site's /api/form endpoints only answer inside its browser session, so
// a model page is opened and the same requests the price widget makes are sent from it.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const STATE = "Gujarat";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36" });
await page.goto("https://www.honda2wheelersindia.com/motorcycle/CB350", { waitUntil: "networkidle", timeout: 90000 });
const api = (path) => page.evaluate((p) => fetch("/api/form/" + p).then((r) => r.json()).catch(() => ({})), path);
const sleep = (ms) => page.waitForTimeout(ms);

const categories = (await api("category")).data || [];
const models = [];
for (const category of categories) {
  const list = (await api("model?category=" + encodeURIComponent(category))).data || [];
  for (const m of list) {
    const modelName = m.model_name || m.name || m;
    const variants = (await api("variant_v2?model_name=" + encodeURIComponent(modelName))).data || [];
    const priced = [];
    for (const v of variants) {
      const q = `productPrice?model_code=${encodeURIComponent(v.model_code)}&state=${STATE}&variant=${encodeURIComponent(v.variant_name)}`;
      const price = Number((((await api(q)).data || [])[0] || {}).ex_show_room_price) || null;
      priced.push({ variant: v.variant_name, model_code: v.model_code, price });
      await sleep(300);
    }
    models.push({ category, model: modelName, raw: m, variants: priced });
    console.log(`${category.padEnd(20)} ${String(modelName).padEnd(22)} ${priced.length} variants, priced ${priced.filter((p) => p.price).length}`);
  }
}
writeFileSync(`${out}/models.json`, JSON.stringify({ state: STATE, models }, null, 1));
await browser.close();
