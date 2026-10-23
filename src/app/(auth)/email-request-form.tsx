"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/errors";

/** Shared single-email form for password reset and verification resend. */
export function EmailRequestForm({ action, cta }: { action: (input: { email: string }) => Promise<ActionResult>; cta: string }) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => setResult(await action({ email })));
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {result ? (
        <Alert variant={result.ok ? "success" : "danger"}>{result.ok ? result.message : result.error}</Alert>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {cta}
      </Button>
    </form>
  );
}
