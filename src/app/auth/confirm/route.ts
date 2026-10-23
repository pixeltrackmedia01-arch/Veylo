import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils";

/**
 * Handles links from Supabase Auth emails (sign-up confirmation, password
 * recovery, email change). Supports both the token_hash template and the
 * PKCE `code` flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // Behind Hostinger's proxy the request URL can carry the internal host (0.0.0.0:3000),
  // so redirect to the configured public site URL when it is set.
  const origin = process.env.NEXT_PUBLIC_SITE_URL ? getSiteUrl() : new URL(request.url).origin;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"), "/dashboard");

  const supabase = await createClient();
  let error: unknown = null;
  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    error = new Error("missing token");
  }

  if (error) return NextResponse.redirect(`${origin}/login?error=link_invalid`);
  const destination = type === "recovery" ? "/reset-password" : next;
  return NextResponse.redirect(`${origin}${destination}${type === "signup" || type === "email" ? (destination.includes("?") ? "&" : "?") + "verified=1" : ""}`);
}
