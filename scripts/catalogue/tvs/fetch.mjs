// fetch.mjs OUTDIR : TVS Motor variants with Gujarat ex-showroom prices.
// Each vehicle page's price widget calls /api/GetVehicleDetails?vehicle=…&stateCode=…&modelIds=…;
// the page is opened, that request is recorded, and it is replayed with Gujarat's state code.
// Pages: the vehicle families below plus their sub-pages linked from them.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const BASE = "https://www.tvsmotor.com";
const SEEDS = ["/tvs-apache", "/tvs-raider", "/tvs-raider-125", "/tvs-ronin", "/tvs-sport", "/tvs-xl100", "/tvs-zest", "/tvs-jupiter",
  "/tvs-jupiter-125", "/tvs-ntorq-125", "/tvs-ntorq-150", "/tvs-radeon", "/tvs-star-city-plus", "/tvs-scooty-pep-plus",
  "/electric-scooters/tvs-iqube", "/electric-scooters/tvs-orbiter", "/electric-scooters/tvs-x"];
const SKIP = /book-a-test|dealer|connectivity|accessor|blog|offers|compare|emi|service|news/i;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36" });
let current = [];
page.on("request", (r) => { if (r.url().includes("/api/GetVehicleDetails")) current.push(r.url()); });

// requests are sent from inside the page (the browser uses the network proxy; Node-side requests don't)
const inPage = (url) => page.evaluate((u) => fetch(u).then((r) => r.json()).catch(() => []), url);
await page.goto(BASE + "/tvs-jupiter", { waitUntil: "domcontentloaded", timeout: 60000 });
const states = await inPage(BASE + "/api/GetStates?");
const list = typeof states === "string" ? JSON.parse(states) : states;
const GUJ = list.find((s) => s.State.trim().toLowerCase() === "gujarat").StateCode;

const queue = [...SEEDS], seen = new Set(), calls = new Map();
while (queue.length) {
  const path = queue.shift();
  if (seen.has(path) || seen.size > 70) continue;
  seen.add(path);
  current = [];
  try {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);
  } catch { continue; }
  for (const u of current) {
    const vehicle = new URL(u).searchParams.get("vehicle");
    if (vehicle && !calls.has(vehicle)) calls.set(vehicle, { path, url: u });
  }
  if (SEEDS.includes(path)) {
    const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const h of links) {
      const p = (h || "").replace(BASE, "").replace(/\/$/, "");
      if (p.startsWith(path + "/") && !SKIP.test(p) && p.split("/").length <= path.split("/").length + 2) queue.push(p);
    }
  }
}
const models = [];
for (const [vehicle, { path, url }] of calls) {
  const u = new URL(url);
  u.searchParams.set("stateCode", GUJ);
  const prices = await inPage(u.toString());
  await page.waitForTimeout(500);
  models.push({ vehicle, path, prices: Array.isArray(prices) ? prices : [] });
  console.log(`${vehicle.padEnd(28)} ${path.padEnd(48)} ${models.at(-1).prices.length} variants`);
}
writeFileSync(`${out}/models.json`, JSON.stringify({ state_code: GUJ, pages_visited: seen.size, models }, null, 1));
await browser.close();
