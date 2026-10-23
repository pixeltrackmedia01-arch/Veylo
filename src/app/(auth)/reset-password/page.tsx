import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { getViewer } from "@/lib/auth/session";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  const viewer = await getViewer();
  return (
    <>
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      {viewer ? (
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
      ) : (
        <Alert variant="warning" className="mt-6">
          Your reset link has expired or was already used. <Link href="/forgot-password" className="font-semibold text-primary">Request a new link</Link>.
        </Alert>
      )}
    </>
  );
}
