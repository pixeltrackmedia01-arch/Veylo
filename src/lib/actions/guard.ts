import "server-only";

import { getViewer, type Viewer } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/errors";

export type Guarded = { viewer: Viewer; error?: never } | { viewer?: never; error: ActionResult<never> };

/** Server Actions return errors instead of redirecting; RLS and DB functions re-check every call. */
export async function guardAdmin(): Promise<Guarded> {
  const viewer = await getViewer();
  if (!viewer) return { error: { ok: false, error: "Please sign in to continue." } };
  if (!viewer.isAdmin) return { error: { ok: false, error: "You do not have permission to do that." } };
  return { viewer };
}

export async function guardDealer(): Promise<Guarded> {
  const viewer = await getViewer();
  if (!viewer) return { error: { ok: false, error: "Please sign in to continue." } };
  if (!viewer.isDealer) return { error: { ok: false, error: "You do not have permission to do that." } };
  return { viewer };
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
