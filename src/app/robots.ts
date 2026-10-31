import type { MetadataRoute } from "next";
import { getSiteUrl, isNoIndexSite } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  if (isNoIndexSite()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/dealer", "/api/", "/auth/", "/reset-password"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
