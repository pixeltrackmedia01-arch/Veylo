// Jeep India: official ex-showroom prices from the jeep-india.com 3D configurator feed
// (prod-jeep-api.one3d.in), queried inside the configurator page session.
// usage: node scripts/catalogue/jeep/fetch-prices.mjs OUT.json  then  python3 -I scripts/catalogue/jeep/build.py OUT.json
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage();
let auth = null;
p.on("request", (r) => { if (r.url().includes("one3d.in/api/v1") && r.headers().authorization) auth = r.headers().authorization; });
await p.goto("https://www.jeep-india.com/wrangler-jl/3d-configurator.html", { waitUntil: "load", timeout: 90000 });
await p.waitForTimeout(8000);
const frame = p.frames().find((f) => f.url().includes("configurator.jeep-india.com")) || p.mainFrame();
const out = await frame.evaluate(async (auth) => {
  const call = (path, body) => fetch("https://prod-jeep-api.one3d.in/api/v1/" + path, { method: "POST", headers: { "content-type": "application/json", authorization: auth }, body: JSON.stringify({ ...body, source: "web" }) }).then((r) => r.json());
  const models = await call("models/all", {});
  const list = models.response?.models || models.response || [];
  const res = { models: list.map((m) => ({ id: m.model_id, name: m.model_name })), variants: {} };
  for (const m of list) res.variants[m.model_name] = (await call("variants/all", { model_id: m.model_id })).response?.variants || [];
  return res;
}, auth);
writeFileSync(process.argv[2] || "jeep-prices.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.models), Object.entries(out.variants).map(([k, v]) => `${k}:${v.length}`).join(" "));
await b.close();
