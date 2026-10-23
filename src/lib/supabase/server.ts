import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv } from "@/lib/env";

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
}

/**
 * User-scoped server client. Reads and refreshes the session from cookies so
 * every query runs as the signed-in user under RLS.
 */
export async function createClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  if (!url || !anonKey) throw new SupabaseNotConfiguredError();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. The
          // proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}
