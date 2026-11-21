import "server-only";

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { VehicleImage } from "@/lib/types";

/**
 * Demo photos (reference photos for the school-project demo).
 *
 * `.demo-photos.json` (built by scripts/demo-photos/build-manifest.py) maps each
 * vehicle slug to photos in demo-photos/. They are served by
 * /api/demo-photos/[slug]/[n] in one of two modes:
 *
 * - "local":   `next dev` with LOCAL_DEMO_PHOTOS=true reads the files from disk.
 * - "storage": DEMO_PHOTOS_STORAGE=true (set only on a password-protected
 *              deployment) redirects to a short-lived signed URL in the PRIVATE
 *              Supabase bucket "demo-photos" (uploaded by upload-to-supabase.mjs).
 *
 * With neither flag set (the default, including every public deployment) the
 * feature is off and vehicles show their database images.
 */
interface DemoManifest {
  [slug: string]: { vehicleId: string; name: string; photos: { path: string; label: string }[] };
}

export const DEMO_PHOTOS_BUCKET = "demo-photos";

// Re-read whenever the file changes (or appears/disappears), so rebuilding the
// manifest takes effect without restarting the dev server.
let cached: { mtimeMs: number; data: DemoManifest | null } | undefined;

export function demoPhotosMode(): "off" | "local" | "storage" {
  if (process.env.DEMO_PHOTOS_STORAGE === "true") return "storage";
  if (process.env.NODE_ENV !== "production" && process.env.LOCAL_DEMO_PHOTOS === "true") return "local";
  return "off";
}

export function demoPhotosEnabled() {
  return demoPhotosMode() !== "off";
}

/**
 * Object key in the private bucket for a manifest path, e.g.
 * "demo-photos/cars/Toyota/Glanza/colour_CAFÉ-WHITE.jpg" -> "cars/toyota/glanza/colour-cafe-white.webp".
 * Must stay identical to storageKey() in scripts/demo-photos/upload-to-supabase.mjs.
 */
export function demoPhotoStorageKey(manifestPath: string) {
  const slug = (s: string) =>
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

export function getDemoManifest(): DemoManifest | null {
  if (!demoPhotosEnabled()) return null;
  const file = path.join(process.cwd(), ".demo-photos.json");
  let mtimeMs = -1;
  try {
    mtimeMs = statSync(file).mtimeMs;
  } catch {
    // missing file: no demo photos
  }
  if (cached?.mtimeMs === mtimeMs) return cached.data;
  let data: DemoManifest | null = null;
  if (mtimeMs >= 0) {
    try {
      data = JSON.parse(readFileSync(file, "utf8")) as DemoManifest;
    } catch {
      data = null;
    }
  }
  cached = { mtimeMs, data };
  return data;
}

/** The vehicle's local demo photos when enabled and available; otherwise its own images. */
export function withDemoPhotos(slug: string, images: VehicleImage[]): VehicleImage[] {
  const entry = getDemoManifest()?.[slug];
  if (!entry?.photos.length) return images;
  return entry.photos.map((p, i) => ({
    id: `demo-${slug}-${i}`,
    vehicle_id: entry.vehicleId,
    variant_id: null,
    storage_path: null,
    external_url: `/api/demo-photos/${encodeURIComponent(slug)}/${i}`,
    alt_text: i === 0 ? entry.name : `${entry.name} — ${p.label}`,
    attribution: "Local demo photo (not published)",
    is_placeholder: false,
    sort_order: i,
  }));
}

function colourKey(name: string) {
  return name
    .toLowerCase()
    .replace(/balck/g, "black")
    .replace(/\(.*?\)/g, "")
    .replace(/(with|and)?[\s-]*(dual|single)[\s-]*ton(e)?.*$/, "")
    .replace(/[^a-z]/g, "");
}

/**
 * Local colour photos (files named `colour_*`) matched to the vehicle's paint
 * names, as { colourName: url }. Empty unless demo photos are enabled.
 */
export function demoColourPhotos(slug: string, colourNames: string[]): Record<string, string> {
  const entry = getDemoManifest()?.[slug];
  if (!entry) return {};
  // Two-tone paints ("with black roof", "dual tone", "+ black") should match two-tone photos.
  const twoTone = (s: string) => /\bwith\b|roof|dual|\+/i.test(s);
  const swatches = entry.photos
    .map((p, i) => ({ key: colourKey(p.label), two: twoTone(p.label), file: path.basename(p.path).toLowerCase(), i }))
    .filter((p) => p.file.startsWith("colour_") && p.key);
  const out: Record<string, string> = {};
  for (const name of colourNames) {
    const key = colourKey(name);
    if (!key) continue;
    const two = twoTone(name);
    const base = (k: string) => k.replace(/with.*$/, "");
    const related = (s: (typeof swatches)[number]) => s.key.startsWith(key) || key.startsWith(s.key) || base(s.key) === base(key);
    const hit =
      swatches.find((s) => s.key === key) ??
      swatches.find((s) => related(s) && s.two === two) ??
      swatches.find((s) => related(s));
    if (hit) out[name] = `/api/demo-photos/${encodeURIComponent(slug)}/${hit.i}`;
  }
  return out;
}

/** Apply demo photos in place to anything shaped like a vehicle with images. */
export function applyDemoPhotos<T extends { slug: string; images?: VehicleImage[] | null }>(vehicle: T | null | undefined): T | null | undefined {
  if (vehicle && demoPhotosEnabled()) vehicle.images = withDemoPhotos(vehicle.slug, vehicle.images ?? []);
  return vehicle;
}
