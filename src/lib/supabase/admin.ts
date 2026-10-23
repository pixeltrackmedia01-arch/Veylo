import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS — use only in trusted server code after
 * authorising the caller (cron jobs, email dispatch, rate limiting, signed
 * URLs for verified participants). Never import from client components.
 */
export function createAdminClient() {
  const { url } = getPublicSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
