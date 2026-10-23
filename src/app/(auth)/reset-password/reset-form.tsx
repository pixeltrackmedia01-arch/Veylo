"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { updatePasswordAction } from "@/lib/actions/auth";
import { resetPasswordSchema } from "@/lib/validation/schemas";

type Values = z.input<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const form = useForm<Values>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirm: "" } });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        const res = await updatePasswordAction(values);
        if (res.ok) {
          toast.success(res.message);
          router.push("/dashboard");
        } else toast.error(res.error);
      })}
    >
      <FormField id="password" label="New password" error={errors.password?.message} hint="At least 10 characters, with a letter and a number">
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("password")} />}
      </FormField>
      <FormField id="confirm" label="Confirm new password" error={errors.confirm?.message}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("confirm")} />}
      </FormField>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        Update password
      </Button>
    </form>
  );
}
