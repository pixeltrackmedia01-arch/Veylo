"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Checkbox, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { createBatchAction, requestQuotationsAction, updateBatchDetailsAction } from "@/lib/actions/admin-catalogue";
import { slugify } from "@/lib/utils";
import { batchSchema, type BatchInput } from "@/lib/validation/schemas";

export function BatchForm({
  variants,
  cities,
  defaults,
}: {
  variants: { id: string; label: string }[];
  cities: { id: string; name: string }[];
  defaults: BatchInput;
}) {
  const router = useRouter();
  const form = useForm<BatchInput>({ resolver: zodResolver(batchSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await createBatchAction(v);
        if (res.ok && res.data) {
          toast.success(res.message);
          router.push(`/admin/batches/${res.data.id}`);
        } else if (!res.ok) {
          toast.error(res.error);
          for (const [k, msg] of Object.entries(res.fieldErrors ?? {})) if (msg?.[0]) form.setError(k as keyof BatchInput, { message: msg[0] });
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="variantId" label="Exact model & variant" required error={errors.variantId?.message}>
          {(p) => (
            <NativeSelect
              {...p}
              {...form.register("variantId", {
                onChange: (e) => {
                  const label = variants.find((x) => x.id === e.target.value)?.label ?? "";
                  const city = cities.find((c) => c.id === form.getValues("cityId"))?.name ?? "";
                  form.setValue("title", `${label} — ${city} group`);
                  form.setValue("slug", slugify(`${city} ${label} ${new Date().toISOString().slice(0, 7)}`));
                },
              })}
            >
              <option value="">Select a variant…</option>
              {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="cityId" label="City" required>
          {(p) => <NativeSelect {...p} {...form.register("cityId")}>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>}
        </FormField>
        <FormField id="title" label="Title" required error={errors.title?.message}>
          {(p) => <Input {...p} {...form.register("title")} />}
        </FormField>
        <FormField id="slug" label="URL slug" required error={errors.slug?.message}>
          {(p) => <Input {...p} {...form.register("slug")} />}
        </FormField>
        <FormField id="deliveryArea" label="Eligible delivery area" required error={errors.deliveryArea?.message}>
          {(p) => <Input {...p} {...form.register("deliveryArea")} />}
        </FormField>
        <FormField id="deadline" label="Deadline (IST)" required error={errors.deadline?.message}>
          {(p) => <Input {...p} type="datetime-local" {...form.register("deadline")} />}
        </FormField>
        <FormField id="targetParticipants" label="Target verified participants" required error={errors.targetParticipants?.message}>
          {(p) => <Input {...p} type="number" min={2} max={500} {...form.register("targetParticipants")} />}
        </FormField>
        <FormField id="minimumParticipants" label="Minimum for quotations at deadline" required error={errors.minimumParticipants?.message} hint="Below this at the deadline, the batch expires.">
          {(p) => <Input {...p} type="number" min={1} max={500} {...form.register("minimumParticipants")} />}
        </FormField>
      </div>
      <FormField id="eligibilityRules" label="Eligibility rules">
        {(p) => <Textarea {...p} rows={3} {...form.register("eligibilityRules")} />}
      </FormField>
      <label className="flex items-center gap-2 text-sm"><Checkbox {...form.register("isDemo")} /> Demo batch (labelled “Demo” publicly)</label>
      <Button type="submit" disabled={isSubmitting} className="justify-self-start">
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} Create draft batch
      </Button>
    </form>
  );
}

export function BatchDetailsForm({ id, title, deliveryArea, eligibilityRules }: { id: string; title: string; deliveryArea: string; eligibilityRules: string }) {
  const [state, setState] = useState({ title, deliveryArea, eligibilityRules });
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateBatchDetailsAction(id, state);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="bd-title" label="Title">{(p) => <Input {...p} value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} />}</FormField>
        <FormField id="bd-area" label="Delivery area">{(p) => <Input {...p} value={state.deliveryArea} onChange={(e) => setState({ ...state, deliveryArea: e.target.value })} />}</FormField>
      </div>
      <FormField id="bd-rules" label="Eligibility rules">{(p) => <Textarea {...p} rows={2} value={state.eligibilityRules} onChange={(e) => setState({ ...state, eligibilityRules: e.target.value })} />}</FormField>
      <Button type="submit" size="sm" variant="outline" disabled={pending} className="justify-self-start">Save details</Button>
    </form>
  );
}

export function DealerRequestPicker({ batchId, dealers }: { batchId: string; dealers: { id: string; name: string; requested: boolean; isDemo: boolean }[] }) {
  const [selected, setSelected] = useState<string[]>(dealers.filter((d) => !d.requested).map((d) => d.id));
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!dealers.length) {
    return <p className="text-sm text-muted-foreground">No active, verified dealers in this city are authorised for this brand yet.</p>;
  }
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {dealers.map((d) => (
          <li key={d.id}>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                disabled={d.requested}
                checked={d.requested || selected.includes(d.id)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, d.id] : s.filter((x) => x !== d.id)))}
              />
              {d.name} {d.requested ? <span className="text-xs text-muted-foreground">(already requested)</span> : null}
              {d.isDemo ? <span className="text-xs text-amber-700">demo</span> : null}
            </label>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        disabled={pending || selected.length === 0}
        onClick={() =>
          start(async () => {
            const res = await requestQuotationsAction(batchId, selected);
            if (res.ok) toast.success(res.message);
            else toast.error(res.error);
            router.refresh();
          })
        }
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Send quotation requests
      </Button>
    </div>
  );
}
