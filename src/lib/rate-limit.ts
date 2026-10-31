import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// Per-process fallback for hosts without the service-role key (a single Node.js
// process on shared hosting), so per-IP limits still apply there.
const memoryHits = new Map<string, { window: number; hits: number }>();

function memoryRateLimit(key: string, limit: number, windowSeconds: number) {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const entry = memoryHits.get(key);
  const hits = entry && entry.window === window ? entry.hits + 1 : 1;
  memoryHits.set(key, { window, hits });
  if (memoryHits.size > 10_000) {
    for (const [k, v] of memoryHits) if (v.window !== window) memoryHits.delete(k);
  }
  return hits <= limit;
}

/**
 * Database-backed fixed-window rate limit (works across instances without
 * Redis). Returns true when the request may proceed. Without the service-role
 * key it falls back to an in-memory limit for this process.
 */
export async function rateLimit(bucket: string, identifier: string, limit: number, windowSeconds: number) {
  const admin = createAdminClient();
  if (!admin) return memoryRateLimit(`${bucket}:${identifier}`, limit, windowSeconds);
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: `${bucket}:${identifier}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return memoryRateLimit(`${bucket}:${identifier}`, limit, windowSeconds);
  }
  return data === true;
}
