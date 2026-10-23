"use client";

import { useState } from "react";
import { EmiCalculator } from "@/components/cars/emi-calculator";
import { LeadDialog, type LeadTarget } from "@/components/cars/lead-dialog";
import { formatINR } from "@/lib/format";

export type EmiCarOption = { slug: string; id: string; label: string; variants: { id: string; name: string; onRoad: number | null; exShowroom: number | null }[] };

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-ink hover:border-primary/50 focus:border-primary focus:outline-none";

/** Standalone EMI calculator with an optional car → variant picker to pre-fill the price. */
export function EmiPageCalculator({ cars, initialCar }: { cars: EmiCarOption[]; initialCar?: string }) {
  const [carSlug, setCarSlug] = useState(initialCar ?? "");
  const car = cars.find((c) => c.slug === carSlug);
  const [variantId, setVariantId] = useState(car?.variants[0]?.id ?? "");
  const variant = car?.variants.find((v) => v.id === variantId) ?? car?.variants[0];
  const price = variant?.onRoad ?? variant?.exShowroom ?? 800000;
  const [lead, setLead] = useState<LeadTarget | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:grid-cols-[1fr_1fr] sm:p-6">
        <label className="space-y-1.5 text-sm font-medium text-ink">
          Car (optional)
          <select
            value={carSlug}
            onChange={(e) => {
              setCarSlug(e.target.value);
              setVariantId(cars.find((c) => c.slug === e.target.value)?.variants[0]?.id ?? "");
            }}
            className={selectClass}
          >
            <option value="">Enter a price manually</option>
            {cars.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium text-ink">
          Variant
          <select value={variant?.id ?? ""} onChange={(e) => setVariantId(e.target.value)} disabled={!car} className={selectClass}>
            {car ? (
              car.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.onRoad ? ` — on-road ≈ ${formatINR(v.onRoad)}` : ""}
                </option>
              ))
            ) : (
              <option>Select a car first</option>
            )}
          </select>
        </label>
      </div>
      <EmiCalculator
        key={`${car?.slug ?? "manual"}-${variant?.id ?? ""}`}
        price={price}
        priceLabel={car && variant ? `On-road price · ${car.label} ${variant.name}` : "Vehicle price"}
        onLoanEnquiry={() => setLead({ kind: "car_loan", vehicleId: car?.id, variantId: variant?.id, label: car ? `${car.label} ${variant?.name ?? ""}` : undefined })}
      />
      <LeadDialog target={lead} onOpenChange={(o) => !o && setLead(null)} />
    </div>
  );
}
