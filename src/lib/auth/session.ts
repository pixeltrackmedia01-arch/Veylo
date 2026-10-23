import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";

export interface Viewer {
  id: string;
  email: string | null;
  profile: Profile | null;
  roles: AppRole[];
  dealerIds: string[];
  isAdmin: boolean;
  isDealer: boolean;
}

/**
 * The signed-in user for this request, verified via getClaims() (never trust
 * getSession() on the server). Cached per request.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [profileRes, rolesRes, dealerRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("dealer_users").select("dealer_id, is_active").eq("user_id", userId).eq("is_active", true),
  ]);

  const profile = (profileRes.data as Profile | null) ?? null;
  const roles = ((rolesRes.data ?? []) as { role: AppRole }[]).map((r) => r.role);
  const dealerIds = ((dealerRes.data ?? []) as { dealer_id: string }[]).map((d) => d.dealer_id);
  const suspended = profile?.is_suspended ?? false;

  return {
    id: userId,
    email: (data.claims.email as string | undefined) ?? profile?.email ?? null,
    profile,
    roles,
    dealerIds: suspended ? [] : dealerIds,
    isAdmin: !suspended && roles.includes("admin"),
    isDealer: !suspended && dealerIds.length > 0,
  };
});

export async function requireViewer(nextPath?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  // Respond as if the area does not exist rather than revealing it.
  if (!viewer.isAdmin) notFound();
  return viewer;
}

export async function requireDealer(): Promise<Viewer & { dealerId: string }> {
  const viewer = await requireViewer("/dealer");
  if (!viewer.isDealer) notFound();
  return { ...viewer, dealerId: viewer.dealerIds[0] };
}
