"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "@/lib/env";

/** Browser client: uses only the public anon key; all access is governed by RLS. */
export function createClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createBrowserClient(url, anonKey);
}
