import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { getViewer } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/utils";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeRedirectPath(sp.next);
  if (await getViewer()) redirect(next);
  return (
    <>
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-muted-foreground">Log in to track your groups and quotations.</p>
      {sp.error === "link_invalid" ? (
        <Alert variant="warning" className="mt-5">
          That link is invalid or has expired. Log in, or request a new link.
        </Alert>
      ) : null}
      <div className="mt-6">
        <LoginForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          Create a free account
        </Link>
      </p>
    </>
  );
}
