"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { createAgreementAction } from "@/lib/actions/admin-ops";
import { todayInIndia } from "@/lib/format";
import { agreementSchema, type AgreementInput } from "@/lib/validation/schemas";

type Opt = { id: string; name: string };

export function AgreementForm({ dealers, manufacturers, vehicles, batches }: { dealers: Opt[]; manufacturers: Opt[]; vehicles: Opt[]; batches: Opt[] }) {
  const router = useRouter();
  const form = useForm<AgreementInput>({
    resolver: zodResolver(agreementSchema),
    defaultValues: { name: "", calcType: "fixed", effectiveFrom: todayInIndia(), status: "draft", dealerId: "", manufacturerId: "", vehicleId: "", variantId: "", batchId: "" },
  });
  const calcType = useWatch({ control: form.control, name: "calcType" });
  const { errors, isSubmitting } = form.formState;
  const scope = (name: "dealerId" | "manufacturerId" | "vehicleId" | "batchId", label: string, opts: Opt[]) => (
    <FormField id={name} label={label}>
      {(p) => (
        <NativeSelect {...p} {...form.register(name)}>
          <option value="">Any</option>
          {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </NativeSelect>
      )}
    </FormField>
  );
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await createAgreementAction(v);
        if (res.ok) {
          toast.success(res.message);
          form.reset();
          router.refresh();
        } else {
          toast.error(res.error);
          for (const [k, m] of Object.entries(res.fieldErrors ?? {})) if (m?.[0]) form.setError(k as keyof AgreementInput, { message: m[0] });
        }
      })}
    >
      <FormField id="name" label="Agreement name" required error={errors.name?.message}>{(p) => <Input {...p} {...form.register("name")} />}</FormField>
      <div className="grid gap-4 sm:grid-cols-4">
        {scope("dealerId", "Dealer", dealers)}
        {scope("manufacturerId", "Manufacturer", manufacturers)}
        {scope("vehicleId", "Model", vehicles)}
        {scope("batchId", "Campaign (batch)", batches)}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <FormField id="calcType" label="Calculation">
          {(p) => (
            <NativeSelect {...p} {...form.register("calcType")}>
              <option value="fixed">Fixed amount per verified sale</option>
              <option value="percentage">Percentage of a defined basis</option>
            </NativeSelect>
          )}
        </FormField>
        {calcType === "fixed" ? (
          <FormField id="fixedAmount" label="Fixed amount (₹)" required error={errors.fixedAmount?.message}>{(p) => <Input {...p} type="number" min={0} step="0.01" {...form.register("fixedAmount")} />}</FormField>
        ) : (
          <FormField id="percentage" label="Percentage (%)" required error={errors.percentage?.message}>{(p) => <Input {...p} type="number" min={0} max={100} step="0.001" {...form.register("percentage")} />}</FormField>
        )}
        <FormField id="capAmount" label="Cap (₹, optional)" error={errors.capAmount?.message}>{(p) => <Input {...p} type="number" min={0} {...form.register("capAmount", { setValueAs: (v) => (v === "" ? undefined : v) })} />}</FormField>
        <FormField id="status" label="Status">
          {(p) => (
            <NativeSelect {...p} {...form.register("status")}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </NativeSelect>
          )}
        </FormField>
      </div>
      {calcType === "percentage" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="basisLabel" label="Commission basis (required)" required error={errors.basisLabel?.message} hint="Exactly what the percentage applies to, e.g. “Ex-showroom price on dealer invoice”">
            {(p) => <Input {...p} {...form.register("basisLabel")} />}
          </FormField>
          <FormField id="basisDescription" label="Basis definition">{(p) => <Textarea {...p} rows={2} {...form.register("basisDescription")} />}</FormField>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="effectiveFrom" label="Effective from" required error={errors.effectiveFrom?.message}>{(p) => <Input {...p} type="date" {...form.register("effectiveFrom")} />}</FormField>
        <FormField id="effectiveTo" label="Effective to" error={errors.effectiveTo?.message}>{(p) => <Input {...p} type="date" {...form.register("effectiveTo")} />}</FormField>
        <FormField id="notes" label="Notes / contract reference">{(p) => <Input {...p} {...form.register("notes")} />}</FormField>
      </div>
      <Button type="submit" disabled={isSubmitting} className="justify-self-start">Save agreement</Button>
    </form>
  );
}
