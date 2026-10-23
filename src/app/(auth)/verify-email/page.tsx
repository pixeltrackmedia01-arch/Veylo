import type { Metadata } from "next";
import { resendVerificationAction } from "@/lib/actions/auth";
import { EmailRequestForm } from "../email-request-form";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Verify your email</h1>
      <p className="mt-1 text-muted-foreground">
        Open the link we emailed you to activate your account. Need a new one? Enter your email below.
      </p>
      <div className="mt-6">
        <EmailRequestForm action={resendVerificationAction} cta="Resend verification link" />
      </div>
    </>
  );
}
