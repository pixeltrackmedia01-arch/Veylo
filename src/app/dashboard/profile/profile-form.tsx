"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Checkbox, Input, NativeSelect } from "@/components/ui/input";
import { updateProfileAction } from "@/lib/actions/customer";
import { profileSchema, type ProfileInput } from "@/lib/validation/schemas";

export function ProfileForm({ defaults, cities }: { defaults: ProfileInput; cities: { id: string; name: string }[] }) {
  const router = useRouter();
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={form.handleSubmit(async (values) => {
        const res = await updateProfileAction(values);
        if (res.ok) {
          toast.success(res.message);
          router.refresh();
        } else toast.error(res.error);
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="fullName" label="Full name" required error={errors.fullName?.message}>
          {(p) => <Input {...p} autoComplete="name" {...form.register("fullName")} />}
        </FormField>
        <FormField id="phone" label="Mobile number" required error={errors.phone?.message} hint="Changing your number resets its verification.">
          {(p) => <Input {...p} type="tel" autoComplete="tel" {...form.register("phone")} />}
        </FormField>
        <FormField id="cityId" label="City" required error={errors.cityId?.message}>
          {(p) => (
            <NativeSelect {...p} {...form.register("cityId")}>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="preferredCategory" label="Preferred vehicle category">
          {(p) => (
            <NativeSelect {...p} {...form.register("preferredCategory", { setValueAs: (v) => v || null })}>
              <option value="">No preference</option>
              <option value="car">Car</option>
              <option value="two_wheeler">Two-wheeler</option>
            </NativeSelect>
          )}
        </FormField>
        <FormField id="purchaseTimeline" label="Expected purchase timeline">
          {(p) => (
            <NativeSelect {...p} {...form.register("purchaseTimeline", { setValueAs: (v) => v || null })}>
              <option value="">Not sure</option>
              <option value="immediately">Immediately</option>
              <option value="within_1_month">Within 1 month</option>
              <option value="within_3_months">Within 3 months</option>
              <option value="within_6_months">Within 6 months</option>
              <option value="exploring">Just exploring</option>
            </NativeSelect>
          )}
        </FormField>
      </div>
      <fieldset className="grid gap-3 rounded-2xl border p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Notification preferences</legend>
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox {...form.register("notifyEmail")} /> Email me about my account and groups
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox {...form.register("notifyBatchUpdates")} /> Email me group progress updates (closing reminders, target reached)
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox {...form.register("notifyMarketing")} /> Tell me about new groups in my city
        </label>
        <p className="text-xs text-muted-foreground">In-app notifications for important changes are always shown in your dashboard.</p>
      </fieldset>
      <Button type="submit" disabled={isSubmitting} className="justify-self-start">
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} Save profile
      </Button>
    </form>
  );
}
