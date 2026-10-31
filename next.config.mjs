const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

// Scripts stay same-origin ('unsafe-inline' covers Next.js's inline bootstrap and
// JSON-LD); images may come from any https host the CMS points at. frame-ancestors,
// object-src, base-uri and form-action close clickjacking and injection vectors.
const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : "";
const contentSecurityPolicy = [
  "default-src 'self'",
  // React needs eval for dev-mode stack traces only.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")}`.trim(),
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

// Staging/preview copies (e.g. Vercel) must never be indexed: set SITE_NOINDEX=true
// there. Vercel preview deployments are covered automatically.
const noIndex = process.env.SITE_NOINDEX === "true" || (process.env.VERCEL_ENV ?? "production") !== "production";

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ...(noIndex ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
];

// Plain JS (not next.config.ts) so the config loads without native SWC bindings,
// which some hosts (e.g. Hostinger shared Node.js, older glibc) cannot load.
/** @type {import("next").NextConfig} */
const nextConfig = {
  // Every authenticated page reads the session cookie, so this app renders on
  // request and keeps the previous (non-Cache-Components) caching model.
  cacheComponents: false,
  poweredByHeader: false,
  images: {
    // Serve images as stored instead of resizing them on request: the shared
    // Node.js host runs out of worker processes (503) when a gallery page asks
    // the optimizer for dozens of sizes at once. Vehicle photos are uploaded as
    // pre-sized WebP and served from the Supabase Storage CDN.
    unoptimized: true,
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  experimental: {
    serverActions: {
      // Quotation documents and sale evidence are uploaded through Server Actions.
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
