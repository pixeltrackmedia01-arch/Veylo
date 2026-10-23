import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness check for the hosting platform. Reveals no secrets. */
export function GET() {
  return NextResponse.json({ ok: true, supabaseConfigured: isSupabaseConfigured(), time: new Date().toISOString() });
}
