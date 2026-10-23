import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getViewer } from "@/lib/auth/session";
import { getActiveCities } from "@/lib/data/catalogue";
import { isSupabaseConfigured } from "@/lib/env";
import { safeRedirectPath } from "@/lib/utils";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your free account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeRedirectPath(sp.next);
  if (await getViewer()) redirect(next);
  const cities = await getActiveCities();
  return (
    <>
      <h1 className="text-2xl font-bold">Create your free account</h1>
      <p className="mt-1 text-muted-foreground">No registration or joining fee — ever. We only ask for what we need.</p>
      {!isSupabaseConfigured() ? <SetupNotice /> : null}
      <div className="mt-6">
        <SignUpForm cities={cities.map((c) => ({ slug: c.slug, name: c.name }))} next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
