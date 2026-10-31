import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/env";
import { SupabaseNotConfiguredError } from "@/lib/supabase/server";

/**
 * Cookie-less anonymous client for public data that is identical for every
 * visitor, so results can be shared across requests (see public-cache).
 */
export function createPublicClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  if (!url || !anonKey) throw new SupabaseNotConfiguredError();
  return createSupabaseClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
