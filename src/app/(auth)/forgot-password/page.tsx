import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { EmailRequestForm } from "../email-request-form";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="mt-1 text-muted-foreground">We&apos;ll email you a secure link to choose a new password.</p>
      <div className="mt-6">
        <EmailRequestForm action={requestPasswordResetAction} cta="Send reset link" />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-primary hover:underline">Back to log in</Link>
      </p>
    </>
  );
}
