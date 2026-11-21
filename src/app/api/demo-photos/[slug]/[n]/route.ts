import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEMO_PHOTOS_BUCKET, demoPhotoStorageKey, demoPhotosMode, getDemoManifest } from "@/lib/demo-photos";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Serves demo photos. Files are looked up by slug and index in the manifest,
 * never by a path from the request. Returns 404 unless demo photos are enabled
 * (see demoPhotosMode in @/lib/demo-photos).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; n: string }> }) {
  const mode = demoPhotosMode();
  // Short, secret-free reasons so a broken photo can be diagnosed by opening its URL.
  if (mode === "off") return new Response("Not found (demo photos are switched off)", { status: 404 });
  const { slug, n } = await params;
  const manifest = getDemoManifest();
  if (!manifest) return new Response("Not found (photo list .demo-photos.json is missing on the server)", { status: 404 });
  const photo = manifest[slug]?.photos[Number(n)];
  if (!photo) return new Response("Not found (no such photo in the list)", { status: 404 });

  if (mode === "storage") {
    // Private bucket: hand out a short-lived signed URL. Only visitors who got
    // past the deployment's password protection can reach this route.
    const admin = createAdminClient();
    if (!admin) return new Response("Demo photo storage is not configured (SUPABASE_SERVICE_ROLE_KEY missing)", { status: 503 });
    const key = demoPhotoStorageKey(photo.path);
    const { data, error } = await admin.storage.from(DEMO_PHOTOS_BUCKET).createSignedUrl(key, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) {
      return new Response(`Not found (Supabase could not sign "${key}": ${error?.message ?? "no URL returned"})`, { status: 404 });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: data.signedUrl, "Cache-Control": "private, max-age=3000" },
    });
  }

  try {
    // Repo-relative paths (demo-photos/...) resolve against the project root.
    const body = await readFile(path.isAbsolute(photo.path) ? photo.path : path.join(process.cwd(), photo.path));
    return new Response(body, {
      headers: {
        "Content-Type": TYPES[path.extname(photo.path).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
