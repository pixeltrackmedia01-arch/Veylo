"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Checkbox, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { saveQuotationAction } from "@/lib/actions/quotes";
import { computeQuoteTotals, LINE_ITEM_LABELS, LINE_ITEM_ORDER } from "@/lib/domain/pricing";
import { formatINR, todayInIndia } from "@/lib/format";
import { quotationSchema, type QuotationInput } from "@/lib/validation/schemas";

/** Itemised quotation editor. The live total is a preview; the server recomputes it. */
export function QuotationEditor({ quotationId, defaults }: { quotationId: string; defaults: QuotationInput }) {
  const router = useRouter();
  const form = useForm<QuotationInput>({ resolver: zodResolver(quotationSchema), defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const totals = computeQuoteTotals(
    items.map((i) => ({ category: i.category, amount: Number(i.amount) || 0, is_included: Boolean(i.isIncluded) })),
  );
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={form.handleSubmit(async (values) => {
        const res = await saveQuotationAction(quotationId, values);
        if (res.ok) {
          toast.success(res.message);
          router.refresh();
        } else toast.error(res.error);
      })}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="quoteReference" label="Dealer quote reference">
          {(p) => <Input {...p} {...form.register("quoteReference")} />}
        </FormField>
        <FormField id="validUntil" label="Valid until" required error={errors.validUntil?.message}>
          {(p) => <Input {...p} type="date" min={todayInIndia()} {...form.register("validUntil")} />}
        </FormField>
        <FormField id="deliveryTimeline" label="Delivery timeline">
          {(p) => <Input {...p} placeholder="e.g. 2–4 weeks from booking" {...form.register("deliveryTimeline")} />}
        </FormField>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink">Itemised pricing</legend>
        <p className="text-xs text-muted-foreground">
          Enter every charge separately. Untick “Included” for optional items you want to list but not include in the total.
          Discounts are entered as positive amounts.
        </p>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-xl border bg-white p-3 sm:grid-cols-[180px_1fr_150px_auto_auto] sm:items-center">
              <NativeSelect aria-label="Category" {...form.register(`items.${index}.category`)}>
                {LINE_ITEM_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {LINE_ITEM_LABELS[c]}
                  </option>
                ))}
              </NativeSelect>
              <Input aria-label="Description" placeholder="Description" {...form.register(`items.${index}.label`)} aria-invalid={errors.items?.[index]?.label ? true : undefined} />
              <Input aria-label="Amount in rupees" type="number" min={0} step="0.01" inputMode="decimal" {...form.register(`items.${index}.amount`)} aria-invalid={errors.items?.[index]?.amount ? true : undefined} />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox {...form.register(`items.${index}.isIncluded`)} /> Included
              </label>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove line" onClick={() => remove(index)}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        {errors.items?.message || errors.items?.root?.message ? (
          <p role="alert" className="text-xs font-medium text-destructive">{errors.items?.message ?? errors.items?.root?.message}</p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ category: "other_charge", label: "", amount: 0, isIncluded: true })}
        >
          <Plus /> Add line
        </Button>
      </fieldset>

      <div className="flex flex-wrap justify-between gap-4 rounded-2xl bg-surface p-4">
        <div className="text-sm text-muted-foreground">
          Charges {formatINR(totals.charges)} − discounts {formatINR(totals.discounts)} · excluded items {formatINR(totals.excluded)}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total payable (preview)</p>
          <p className="font-display text-2xl font-bold tabular-nums">{formatINR(totals.payable)}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="availabilityNote" label="Stock / availability">
          {(p) => <Textarea {...p} rows={3} {...form.register("availabilityNote")} />}
        </FormField>
        <FormField id="conditions" label="Conditions">
          {(p) => <Textarea {...p} rows={3} placeholder="Offer conditions, exclusions, required documents…" {...form.register("conditions")} />}
        </FormField>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} Save quotation
      </Button>
    </form>
  );
}
