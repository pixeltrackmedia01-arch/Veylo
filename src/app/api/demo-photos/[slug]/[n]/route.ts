import { readFile } from "node:fs/promises";
import path from "node:path";
import { demoPhotosEnabled, getDemoManifest } from "@/lib/demo-photos";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/**
 * Serves local demo photos during `next dev` only. Files are looked up by
 * slug and index in the manifest, never by a path from the request, and the
 * route returns 404 in production.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; n: string }> }) {
  if (!demoPhotosEnabled()) return new Response("Not found", { status: 404 });
  const { slug, n } = await params;
  const photo = getDemoManifest()?.[slug]?.photos[Number(n)];
  if (!photo) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(photo.path);
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
