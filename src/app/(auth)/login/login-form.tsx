"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/lib/actions/auth";
import { signInSchema } from "@/lib/validation/schemas";

type Values = z.input<typeof signInSchema>;

export function LoginForm({ next }: { next?: string }) {
  const form = useForm<Values>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: Values) {
    const res = await signInAction(values, next);
    // On success the action redirects; we only get a result back on failure.
    if (res && !res.ok) toast.error(res.error);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormField id="email" label="Email" error={errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
      </FormField>
      <FormField id="password" label="Password" error={errors.password?.message}>
        {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register("password")} />}
      </FormField>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        Log in
      </Button>
    </form>
  );
}
