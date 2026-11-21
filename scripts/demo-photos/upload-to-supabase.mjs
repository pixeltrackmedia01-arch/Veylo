// Upload the demo photos to the PRIVATE Supabase Storage bucket "demo-photos".
//
// Each photo listed in .demo-photos.json is resized (max 1280 px wide), converted
// to WebP and uploaded with the service role key, so the bucket never needs a
// public or anonymous policy. Safe to re-run: existing objects are overwritten.
//
// Needs in .env.local: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// Usage (repo root): node scripts/demo-photos/upload-to-supabase.mjs [--dry-run]
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BUCKET = "demo-photos";
const CONCURRENCY = 8;
const dryRun = process.argv.includes("--dry-run");

/** Must stay identical to demoPhotoStorageKey() in src/lib/demo-photos.ts. */
export function storageKey(manifestPath) {
  const slug = (s) =>
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const parts = manifestPath.replace(/\\/g, "/").replace(/^demo-photos\//, "").split("/");
  const file = parts.pop() ?? "";
  return [...parts.map(slug), `${slug(file.replace(/\.[^.]+$/, ""))}.webp`].join("/");
}

function readEnv() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
    }
  } catch {
    // no .env.local
  }
  return env;
}

const env = readEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && (!url || !key)) {
  console.error("Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local first.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(".demo-photos.json", "utf8"));
const files = new Map(); // storage key -> local path
for (const entry of Object.values(manifest)) {
  for (const p of entry.photos) {
    const k = storageKey(p.path);
    const prev = files.get(k);
    if (prev && prev !== p.path) {
      console.error(`Key collision: ${k}\n  ${prev}\n  ${p.path}`);
      process.exit(1);
    }
    files.set(k, p.path);
  }
}
console.log(`${files.size} unique photos -> bucket "${BUCKET}"${dryRun ? " (dry run)" : ""}`);
if (dryRun) process.exit(0);

const headers = { Authorization: `Bearer ${key}`, apikey: key };

async function ensurePrivateBucket() {
  const res = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers });
  const body = { id: BUCKET, name: BUCKET, public: false, file_size_limit: 5242880, allowed_mime_types: ["image/webp"] };
  const r = res.ok
    ? await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) })
    : await fetch(`${url}/storage/v1/bucket`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Bucket setup failed: ${r.status} ${await r.text()}`);
  const check = await (await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers })).json();
  if (check.public !== false) throw new Error("Bucket is not private; stopping.");
}

async function upload(k, localPath) {
  const data = await sharp(path.resolve(localPath)).rotate().resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`${url}/storage/v1/object/${BUCKET}/${k}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "image/webp", "x-upsert": "true", "Cache-Control": "max-age=31536000" },
      body: data,
    });
    if (r.ok) return data.length;
    if (attempt === 3) throw new Error(`${k}: ${r.status} ${await r.text()}`);
    await new Promise((res) => setTimeout(res, 1000 * attempt));
  }
  return 0;
}

await ensurePrivateBucket();
const queue = [...files.entries()];
let done = 0;
let bytes = 0;
const failures = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        const size = await upload(item[0], item[1]);
        bytes += size;
      } catch (e) {
        failures.push(String(e.message ?? e));
      }
      if (++done % 250 === 0 || done === files.size) console.log(`${done}/${files.size} (${Math.round(bytes / 1048576)} MB)`);
    }
  }),
);
console.log(`Uploaded ${files.size - failures.length} of ${files.size}, ${Math.round(bytes / 1048576)} MB.`);
if (failures.length) {
  console.error(`${failures.length} failed:\n${failures.slice(0, 20).join("\n")}`);
  process.exit(1);
}
