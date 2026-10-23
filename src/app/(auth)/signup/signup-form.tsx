"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Checkbox, Input, NativeSelect } from "@/components/ui/input";
import { signUpAction } from "@/lib/actions/auth";
import { signUpSchema, type SignUpInput } from "@/lib/validation/schemas";

export function SignUpForm({ cities, next }: { cities: { slug: string; name: string }[]; next?: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      city: cities[0]?.slug ?? "",
      preferredCategory: "car",
      purchaseTimeline: "within_3_months",
      password: "",
      acceptTerms: false as unknown as true,
    },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: SignUpInput) {
    const res = await signUpAction(values, next);
    if (!res) return;
    if (res.ok) setSentTo(values.email);
    else {
      toast.error(res.error);
      for (const [key, msgs] of Object.entries(res.fieldErrors ?? {})) {
        if (msgs?.[0]) form.setError(key as keyof SignUpInput, { message: msgs[0] });
      }
    }
  }

  if (sentTo) {
    return (
      <Alert variant="success" title="Check your inbox">
        <p>
          We sent a verification link to <strong>{sentTo}</strong>. Open it to activate your account, then join your group.
        </p>
        <p className="mt-2">
          Didn&apos;t get it? <Link href="/verify-email" className="font-semibold text-primary">Resend the link</Link>.
        </p>
        <MailCheck className="sr-only" aria-hidden="true" />
      </Alert>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormField id="fullName" label="Full name" required error={errors.fullName?.message}>
        {(p) => <Input {...p} autoComplete="name" {...form.register("fullName")} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="email" label="Email" required error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
        </FormField>
        <FormField id="phone" label="Mobile number" required error={errors.phone?.message} hint="10-digit Indian mobile">
          {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" {...form.register("phone")} />}
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="city" label="City" required error={errors.city?.message}>
          {(p) => (
            <NativeSelect {...p} {...form.register("city")}>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="preferredCategory" label="Interested in" required error={errors.preferredCategory?.message}>
          {(p) => (
            <NativeSelect {...p} {...form.register("preferredCategory")}>
              <option value="car">Car</option>
              <option value="two_wheeler">Two-wheeler</option>
            </NativeSelect>
          )}
        </FormField>
        <FormField id="purchaseTimeline" label="Buying" required error={errors.purchaseTimeline?.message}>
          {(p) => (
            <NativeSelect {...p} {...form.register("purchaseTimeline")}>
              <option value="immediately">Immediately</option>
              <option value="within_1_month">Within 1 month</option>
              <option value="within_3_months">Within 3 months</option>
              <option value="within_6_months">Within 6 months</option>
              <option value="exploring">Just exploring</option>
            </NativeSelect>
          )}
        </FormField>
      </div>
      <FormField id="password" label="Password" required error={errors.password?.message} hint="At least 10 characters, with a letter and a number">
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("password")} />}
      </FormField>
      <div className="grid gap-1">
        <label className="flex items-start gap-2.5 text-sm">
          <Checkbox className="mt-0.5" {...form.register("acceptTerms")} aria-invalid={errors.acceptTerms ? true : undefined} />
          <span>
            I agree to the <Link href="/terms" className="font-medium text-primary underline-offset-2 hover:underline" target="_blank">Terms</Link> and{" "}
            <Link href="/privacy" className="font-medium text-primary underline-offset-2 hover:underline" target="_blank">Privacy Policy</Link>. I
            understand joining is free and doesn&apos;t guarantee a discount.
          </span>
        </label>
        {errors.acceptTerms ? <p role="alert" className="text-xs font-medium text-destructive">{errors.acceptTerms.message}</p> : null}
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting || cities.length === 0}>
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        Create free account
      </Button>
    </form>
  );
}
