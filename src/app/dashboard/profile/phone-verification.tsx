"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/**
 * Mobile OTP via Supabase Auth phone change. Requires an SMS provider to be
 * configured in Supabase (Auth → Providers → Phone). On success the database
 * trigger marks the profile phone as verified.
 */
export function PhoneVerification({ phone }: { phone: string }) {
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="grid gap-3">
      {step === "idle" ? (
        <Button
          variant="outline"
          disabled={pending}
          className="justify-self-start"
          onClick={() =>
            start(async () => {
              const { error } = await createClient().auth.updateUser({ phone });
              if (error) toast.error("We couldn't send a code. Mobile verification may not be enabled yet.");
              else {
                toast.success(`Code sent to ${phone}`);
                setStep("code");
              }
            })
          }
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} Send verification code
        </Button>
      ) : (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const { error } = await createClient().auth.verifyOtp({ phone, token: code, type: "phone_change" });
              if (error) toast.error("That code is invalid or expired.");
              else {
                toast.success("Mobile number verified");
                router.refresh();
              }
            });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="otp">6-digit code</Label>
            <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="w-40" />
          </div>
          <Button type="submit" disabled={pending || code.length < 6}>
            Verify
          </Button>
        </form>
      )}
    </div>
  );
}
