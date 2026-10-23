import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Supabase falls back to the bare Site URL (/?code=…) when an email link's
  // redirect is not on its allow list; hand those links to the auth handler.
  const { pathname, search, searchParams } = request.nextUrl;
  if (pathname === "/" && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ? getSiteUrl() : request.nextUrl.origin;
    return NextResponse.redirect(`${origin}/auth/confirm${search}`);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimisation and public files.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
