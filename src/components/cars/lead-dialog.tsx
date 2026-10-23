"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { submitLeadAction } from "@/lib/actions/cars";
import type { LeadKind } from "@/lib/types";

export const LEAD_COPY: Record<LeadKind, { title: string; description: string; cta: string }> = {
  on_road_price: {
    title: "Get the on-road price",
    description: "We'll share the full on-road price breakdown from authorised dealers for your city.",
    cta: "Get On-Road Price",
  },
  test_drive: { title: "Book a test drive", description: "Tell us when suits you and we'll arrange it with an authorised dealer.", cta: "Book Test Drive" },
  callback: { title: "Request a call back", description: "Our team will call you to answer your questions.", cta: "Call Me Back" },
  car_loan: { title: "Car loan offers", description: "We'll connect you with lenders for loan options on this car.", cta: "Get Loan Offers" },
  insurance: { title: "Insurance quotes", description: "Get first-year insurance options for this car.", cta: "Get Insurance Quotes" },
  best_price: {
    title: "Best price this month",
    description: "Tell us about your purchase and we'll come back with the best current price — or a group you can join.",
    cta: "Check my price",
  },
};

export type LeadTarget = { kind: LeadKind; vehicleId?: string; variantId?: string; label?: string };

export function LeadDialog({ target, onOpenChange }: { target: LeadTarget | null; onOpenChange: (open: boolean) => void }) {
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const copy = target ? LEAD_COPY[target.kind] : null;

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) {
          setDone(null);
          setErrors({});
          setFormError(null);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent>
        {copy && target ? (
          done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden="true" />
              <DialogTitle className="mt-3">Request received</DialogTitle>
              <DialogDescription className="mt-2">{done}</DialogDescription>
              <Button className="mt-5" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{copy.title}</DialogTitle>
                <DialogDescription>
                  {target.label ? <strong className="text-ink">{target.label}. </strong> : null}
                  {copy.description}
                </DialogDescription>
              </DialogHeader>
              <form
                className="mt-2 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  start(async () => {
                    const res = await submitLeadAction({
                      kind: target.kind,
                      vehicleId: target.vehicleId,
                      variantId: target.variantId,
                      name: String(fd.get("name") ?? ""),
                      phone: String(fd.get("phone") ?? ""),
                      city: String(fd.get("city") ?? ""),
                      message: String(fd.get("message") ?? ""),
                      consent: fd.get("consent") === "on",
                      website: String(fd.get("website") ?? ""),
                    });
                    if (res.ok) {
                      setDone(res.message ?? "Thanks — we'll be in touch.");
                    } else {
                      setFormError(res.error);
                      setErrors(res.fieldErrors ?? {});
                    }
                  });
                }}
              >
                <FormField id="lead-name" label="Your name" required error={errors.name?.[0]}>
                  {(p) => <Input {...p} name="name" autoComplete="name" required minLength={2} />}
                </FormField>
                <FormField id="lead-phone" label="Mobile number" required error={errors.phone?.[0]} hint="10-digit Indian mobile number">
                  {(p) => <Input {...p} name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="98XXXXXXXX" />}
                </FormField>
                <FormField id="lead-city" label="City" error={errors.city?.[0]}>
                  {(p) => <Input {...p} name="city" defaultValue={siteConfig.launchCity.name} autoComplete="address-level2" />}
                </FormField>
                <FormField id="lead-message" label="Anything we should know? (optional)" error={errors.message?.[0]}>
                  {(p) => <Textarea {...p} name="message" rows={2} maxLength={1000} />}
                </FormField>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <label className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <Checkbox name="consent" required className="mt-0.5" />
                  <span>
                    I agree that {siteConfig.name} and its partner dealers or lenders may contact me about this request.
                    {errors.consent?.[0] ? <span className="block text-destructive">{errors.consent[0]}</span> : null}
                  </span>
                </label>
                {formError ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p> : null}
                <Button type="submit" className="h-11 w-full" disabled={pending}>
                  {pending ? "Sending…" : copy.cta}
                </Button>
              </form>
            </>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
