import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import type { VehicleImage } from "@/lib/types";

/**
 * Local demo photos: development-only.
 *
 * `scripts/demo-photos/build-manifest.py` writes a gitignored `.demo-photos.json`
 * that points at photo files on this computer. With LOCAL_DEMO_PHOTOS=true and
 * `next dev`, vehicles in that manifest show those photos instead of their
 * database images. In production this is always off and nothing is read.
 */
interface DemoManifest {
  [slug: string]: { vehicleId: string; name: string; photos: { path: string; label: string }[] };
}

let cached: DemoManifest | null | undefined;

export function demoPhotosEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.LOCAL_DEMO_PHOTOS === "true";
}

export function getDemoManifest(): DemoManifest | null {
  if (!demoPhotosEnabled()) return null;
  if (cached !== undefined) return cached;
  try {
    cached = JSON.parse(readFileSync(path.join(process.cwd(), ".demo-photos.json"), "utf8")) as DemoManifest;
  } catch {
    cached = null;
  }
  return cached;
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
