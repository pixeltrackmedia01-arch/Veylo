import type { MetadataRoute } from "next";
import { getCatalogue, listPublicBatches } from "@/lib/data/catalogue";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const staticPaths = [
    "",
    "/cars",
    "/vehicles",
    "/groups",
    "/compare",
    "/emi-calculator",
    "/how-it-works",
    "/about",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/disclaimer",
  ];
  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));
  if (!isSupabaseConfigured()) return entries;
  try {
    const [vehicles, batches] = await Promise.all([getCatalogue(), listPublicBatches({ status: "active" })]);
    // Cars have their own product pages; /vehicles/[slug] only serves two-wheelers.
    for (const v of vehicles) {
      const path = v.category === "car" ? `/cars/${v.slug}` : `/vehicles/${v.slug}`;
      entries.push({ url: `${base}${path}`, lastModified: v.updated_at, changeFrequency: "daily", priority: 0.8 });
    }
    for (const b of batches) entries.push({ url: `${base}/groups/${b.slug}`, changeFrequency: "daily", priority: 0.7 });
  } catch {
    // Sitemap still serves static pages if the database is unavailable.
  }
  return entries;
}
