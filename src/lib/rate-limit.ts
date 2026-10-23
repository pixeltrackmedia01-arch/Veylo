import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Database-backed fixed-window rate limit (works across instances without
 * Redis). Returns true when the request may proceed. Fails open only when the
 * service role is not configured (local development).
 */
export async function rateLimit(bucket: string, identifier: string, limit: number, windowSeconds: number) {
  const admin = createAdminClient();
  if (!admin) return true;
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: `${bucket}:${identifier}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return true;
  }
  return data === true;
}
