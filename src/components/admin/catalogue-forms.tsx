"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Checkbox, Input, NativeSelect, Textarea } from "@/components/ui/input";
import {
  addPriceAction,
  createManufacturerAction,
  saveVariantAction,
  saveVehicleAction,
  uploadVehicleImageAction,
} from "@/lib/actions/admin-catalogue";
import type { ActionResult } from "@/lib/errors";
import { todayInIndia } from "@/lib/format";
import { slugify } from "@/lib/utils";
import {
  manufacturerSchema,
  priceSchema,
  variantSchema,
  vehicleSchema,
  type PriceInput,
  type VariantInput,
  type VehicleInput,
} from "@/lib/validation/schemas";
import type { z } from "zod";

/** Shows the error toast and maps server field errors onto the form. Returns true on success. */
function applyErrors(res: ActionResult<unknown>, setError: (name: never, error: { message: string }) => void): boolean {
  if (res.ok) return true;
  toast.error(res.error);
  for (const [k, v] of Object.entries(res.fieldErrors ?? {})) if (v?.[0]) setError(k as never, { message: v[0] });
  return false;
}

export function ManufacturerForm() {
  const router = useRouter();
  type V = z.input<typeof manufacturerSchema>;
  const form = useForm<V>({ resolver: zodResolver(manufacturerSchema), defaultValues: { name: "", slug: "", categories: ["car"], websiteUrl: "" } });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await createManufacturerAction(v);
        if (applyErrors(res, form.setError as never)) {
          toast.success("Manufacturer added.");
          form.reset();
          router.refresh();
        }
      })}
    >
      <FormField id="m-name" label="Manufacturer" error={errors.name?.message}>
        {(p) => <Input {...p} {...form.register("name", { onChange: (e) => form.setValue("slug", slugify(e.target.value)) })} />}
      </FormField>
      <FormField id="m-slug" label="Slug" error={errors.slug?.message}>
        {(p) => <Input {...p} {...form.register("slug")} />}
      </FormField>
      <fieldset className="flex gap-3 pb-3 text-sm">
        <legend className="sr-only">Categories</legend>
        <label className="flex items-center gap-1.5"><Checkbox value="car" {...form.register("categories")} /> Cars</label>
        <label className="flex items-center gap-1.5"><Checkbox value="two_wheeler" {...form.register("categories")} /> 2W</label>
      </fieldset>
      <Button type="submit" disabled={isSubmitting}>Add</Button>
    </form>
  );
}

export function VehicleForm({ id, defaults, manufacturers }: { id: string | null; defaults: VehicleInput; manufacturers: { id: string; name: string }[] }) {
  const router = useRouter();
  const form = useForm<VehicleInput>({ resolver: zodResolver(vehicleSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await saveVehicleAction(id, v);
        if (applyErrors(res, form.setError as never) && res.ok) {
          toast.success(res.message);
          if (!id && res.data) router.push(`/admin/vehicles/${res.data.id}`);
          else router.refresh();
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="manufacturerId" label="Manufacturer" required error={errors.manufacturerId?.message}>
          {(p) => (
            <NativeSelect {...p} {...form.register("manufacturerId")}>
              <option value="">Select…</option>
              {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="category" label="Category" required>
          {(p) => (
            <NativeSelect {...p} {...form.register("category")}>
              <option value="car">Car</option>
              <option value="two_wheeler">Two-wheeler</option>
            </NativeSelect>
          )}
        </FormField>
        <FormField id="modelName" label="Model name" required error={errors.modelName?.message}>
          {(p) => <Input {...p} {...form.register("modelName", { onChange: (e) => !id && form.setValue("slug", slugify(`${manufacturers.find((m) => m.id === form.getValues("manufacturerId"))?.name ?? ""} ${e.target.value}`)) })} />}
        </FormField>
        <FormField id="slug" label="URL slug" required error={errors.slug?.message}>
          {(p) => <Input {...p} {...form.register("slug")} />}
        </FormField>
        <FormField id="bodyType" label="Body type" hint="e.g. hatchback, suv, sedan, scooter, motorcycle">
          {(p) => <Input {...p} {...form.register("bodyType")} />}
        </FormField>
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <Checkbox {...form.register("isDemo")} /> Demo data (shown with a “Demo” label)
        </label>
      </div>
      <FormField id="description" label="Description">
        {(p) => <Textarea {...p} rows={3} {...form.register("description")} />}
      </FormField>
      <FormField id="highlights" label="Highlights" hint="One per line. Only verified facts.">
        {(p) => <Textarea {...p} rows={3} {...form.register("highlights")} />}
      </FormField>
      <Button type="submit" disabled={isSubmitting} className="justify-self-start">
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} {id ? "Save vehicle" : "Create vehicle"}
      </Button>
    </form>
  );
}

export function VariantForm({ id, defaults }: { id: string | null; defaults: VariantInput }) {
  const router = useRouter();
  const form = useForm<VariantInput>({ resolver: zodResolver(variantSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  const nullable = { setValueAs: (v: string) => (v === "" ? null : v) };
  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await saveVariantAction(id, v);
        if (applyErrors(res, form.setError as never) && res.ok) {
          toast.success(res.message);
          if (!id) form.reset(defaults);
          router.refresh();
        }
      })}
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <FormField id={`v-name-${id}`} label="Variant name" required error={errors.name?.message}>
          {(p) => <Input {...p} {...form.register("name", { onChange: (e) => !id && form.setValue("slug", slugify(e.target.value)) })} />}
        </FormField>
        <FormField id={`v-slug-${id}`} label="Slug" required error={errors.slug?.message}>
          {(p) => <Input {...p} {...form.register("slug")} />}
        </FormField>
        <FormField id={`v-fuel-${id}`} label="Fuel">
          {(p) => (
            <NativeSelect {...p} {...form.register("fuelType", nullable)}>
              <option value="">—</option>
              {["petrol", "diesel", "cng", "electric", "hybrid", "petrol_cng"].map((f) => <option key={f} value={f}>{f}</option>)}
            </NativeSelect>
          )}
        </FormField>
        <FormField id={`v-tr-${id}`} label="Transmission">
          {(p) => (
            <NativeSelect {...p} {...form.register("transmission", nullable)}>
              <option value="">—</option>
              {["manual", "automatic", "amt", "cvt", "dct", "not_applicable"].map((f) => <option key={f} value={f}>{f}</option>)}
            </NativeSelect>
          )}
        </FormField>
        <FormField id={`v-cc-${id}`} label="Engine (cc)" error={errors.engineCc?.message}>
          {(p) => <Input {...p} type="number" {...form.register("engineCc", nullable)} />}
        </FormField>
        <FormField id={`v-src-${id}`} label="Specs source" hint="Brochure / manufacturer site">
          {(p) => <Input {...p} {...form.register("specsSource")} />}
        </FormField>
        <FormField id={`v-ver-${id}`} label="Specs checked on">
          {(p) => <Input {...p} type="date" max={todayInIndia()} {...form.register("specsVerifiedAt")} />}
        </FormField>
        <FormField id={`v-status-${id}`} label="Status">
          {(p) => (
            <NativeSelect {...p} {...form.register("status")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
              <option value="archived">Archived</option>
            </NativeSelect>
          )}
        </FormField>
      </div>
      <FormField id={`v-specs-${id}`} label="Verified specifications" hint="One per line as “Name: value”, e.g. “Seating: 5”.">
        {(p) => <Textarea {...p} rows={3} {...form.register("specifications")} />}
      </FormField>
      <Button type="submit" size="sm" disabled={isSubmitting} className="justify-self-start">
        {id ? "Save variant" : "Add variant"}
      </Button>
    </form>
  );
}

export function PriceForm({ vehicleId, variants, cities, defaults }: { vehicleId: string; variants: { id: string; name: string }[]; cities: { id: string; name: string }[]; defaults: Partial<PriceInput> }) {
  const router = useRouter();
  const form = useForm<PriceInput>({
    resolver: zodResolver(priceSchema),
    defaultValues: {
      variantId: variants[0]?.id ?? "",
      cityId: cities[0]?.id ?? "",
      exShowroom: 0,
      registrationRoadTax: 0,
      insurance: 0,
      accessories: 0,
      extendedWarranty: 0,
      otherCharges: 0,
      priceKind: "indicative",
      source: "",
      sourceUrl: "",
      verifiedAt: todayInIndia(),
      validUntil: "",
      isDemo: false,
      notes: "",
      ...defaults,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const money = (name: keyof PriceInput, label: string) => (
    <FormField id={`p-${name}`} label={label} error={errors[name]?.message as string | undefined}>
      {(p) => <Input {...p} type="number" min={0} step="0.01" {...form.register(name)} />}
    </FormField>
  );
  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await addPriceAction(v, vehicleId);
        if (applyErrors(res, form.setError as never) && res.ok) {
          toast.success(res.message);
          router.refresh();
        }
      })}
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <FormField id="p-variant" label="Variant" required>
          {(p) => <NativeSelect {...p} {...form.register("variantId")}>{variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</NativeSelect>}
        </FormField>
        <FormField id="p-city" label="City" required>
          {(p) => <NativeSelect {...p} {...form.register("cityId")}>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>}
        </FormField>
        <FormField id="p-kind" label="Price type">
          {(p) => (
            <NativeSelect {...p} {...form.register("priceKind")}>
              <option value="indicative">Indicative (published list price)</option>
              <option value="verified">Verified with an authorised dealer</option>
            </NativeSelect>
          )}
        </FormField>
        <FormField id="p-verified" label="Verified on" required error={errors.verifiedAt?.message}>
          {(p) => <Input {...p} type="date" max={todayInIndia()} {...form.register("verifiedAt")} />}
        </FormField>
        {money("exShowroom", "Ex-showroom")}
        {money("registrationRoadTax", "Registration & road tax")}
        {money("insurance", "Insurance")}
        {money("accessories", "Accessories")}
        {money("extendedWarranty", "Extended warranty")}
        {money("otherCharges", "Other charges")}
        <FormField id="p-valid" label="Valid until" error={errors.validUntil?.message}>
          {(p) => <Input {...p} type="date" {...form.register("validUntil")} />}
        </FormField>
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><Checkbox {...form.register("isDemo")} /> Demo figure</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="p-source" label="Source" required error={errors.source?.message} hint="Where this price came from, e.g. “Dealer price list dated 01 Oct”">
          {(p) => <Input {...p} {...form.register("source")} />}
        </FormField>
        <FormField id="p-url" label="Source URL" error={errors.sourceUrl?.message}>
          {(p) => <Input {...p} type="url" {...form.register("sourceUrl")} />}
        </FormField>
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting} className="justify-self-start">Record price</Button>
    </form>
  );
}

export function ImageUploadForm({ vehicleId }: { vehicleId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("vehicleId", vehicleId);
        const formEl = e.currentTarget;
        start(async () => {
          const res = await uploadVehicleImageAction(fd);
          if (res.ok) {
            toast.success(res.message);
            formEl.reset();
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <FormField id="img-file" label="Image (JPG/PNG/WebP, max 5 MB)">
        {(p) => <Input {...p} name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="pt-2" />}
      </FormField>
      <FormField id="img-alt" label="Alt text">
        {(p) => <Input {...p} name="alt" required />}
      </FormField>
      <FormField id="img-attr" label="Source / licence">
        {(p) => <Input {...p} name="attribution" required placeholder="e.g. Manufacturer press kit" />}
      </FormField>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />} Upload
      </Button>
    </form>
  );
}
