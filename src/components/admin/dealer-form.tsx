"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Checkbox, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { saveDealerAction } from "@/lib/actions/admin-ops";
import { slugify } from "@/lib/utils";
import { dealerSchema, type DealerInput } from "@/lib/validation/schemas";

export function DealerForm({ id, defaults, cities, manufacturers }: { id: string | null; defaults: DealerInput; cities: { id: string; name: string }[]; manufacturers: { id: string; name: string }[] }) {
  const router = useRouter();
  const form = useForm<DealerInput>({ resolver: zodResolver(dealerSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await saveDealerAction(id, v);
        if (res.ok) {
          toast.success(res.message);
          if (!id && res.data) router.push(`/admin/dealers/${res.data.id}`);
          else router.refresh();
        } else {
          toast.error(res.error);
          for (const [k, m] of Object.entries(res.fieldErrors ?? {})) if (m?.[0]) form.setError(k as keyof DealerInput, { message: m[0] });
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="d-name" label="Dealership name" required error={errors.name?.message}>
          {(p) => <Input {...p} {...form.register("name", { onChange: (e) => !id && form.setValue("slug", slugify(e.target.value)) })} />}
        </FormField>
        <FormField id="d-slug" label="Slug" required error={errors.slug?.message}>{(p) => <Input {...p} {...form.register("slug")} />}</FormField>
        <FormField id="d-address" label="Branch address" required error={errors.branchAddress?.message}>{(p) => <Input {...p} {...form.register("branchAddress")} />}</FormField>
        <FormField id="d-city" label="City" required>
          {(p) => <NativeSelect {...p} {...form.register("cityId")}>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>}
        </FormField>
        <FormField id="d-contact" label="Contact person">{(p) => <Input {...p} {...form.register("contactPerson")} />}</FormField>
        <FormField id="d-email" label="Business email" error={errors.businessEmail?.message}>{(p) => <Input {...p} type="email" {...form.register("businessEmail")} />}</FormField>
        <FormField id="d-phone" label="Business phone">{(p) => <Input {...p} type="tel" {...form.register("businessPhone")} />}</FormField>
        <div className="flex items-end gap-5 pb-3 text-sm">
          <label className="flex items-center gap-2"><Checkbox {...form.register("isActive")} /> Active</label>
          <label className="flex items-center gap-2"><Checkbox {...form.register("isDemo")} /> Demo data</label>
        </div>
      </div>
      <fieldset className="rounded-xl border p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Authorised brands</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {manufacturers.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm"><Checkbox value={m.id} {...form.register("manufacturerIds")} /> {m.name}</label>
          ))}
        </div>
      </fieldset>
      <FormField id="d-notes" label="Internal notes (admins only)">{(p) => <Textarea {...p} rows={3} {...form.register("internalNotes")} />}</FormField>
      <Button type="submit" disabled={isSubmitting} className="justify-self-start">
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} {id ? "Save dealer" : "Add dealer"}
      </Button>
    </form>
  );
}
