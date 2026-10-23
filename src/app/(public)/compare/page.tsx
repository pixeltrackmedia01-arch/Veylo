import { GitCompareArrows, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CarVisual } from "@/components/cars/car-visual";
import { CompareRemove, ComparePicker, CompareSync } from "@/components/cars/compare-controls";
import { SetupNotice } from "@/components/shared/setup-notice";
import { siteConfig } from "@/config/site";
import { type CarSummary, getCars } from "@/lib/data/cars";
import { parseList } from "@/lib/domain/car-filters";
import { bodyLabel, fuelLabel, transmissionLabel } from "@/lib/domain/car-labels";
import { isSupabaseConfigured } from "@/lib/env";
import { formatINR, formatPriceLakh } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Compare Cars",
  description: "Compare up to three new cars side by side: prices, on-road estimates, engines, mileage, dimensions, features and EMI.",
  alternates: { canonical: "/compare" },
};

type Row = { label: string; value: (c: CarSummary) => string };

const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter(Boolean))].join(" / ") || "—";
const spec = (c: CarSummary, key: string) => String(c.baseVariant?.specifications?.[key] ?? "—");

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "Price",
    rows: [
      { label: "Ex-showroom from", value: (c) => formatPriceLakh(c.fromPrice) },
      { label: "Ex-showroom up to", value: (c) => formatPriceLakh(c.toPrice) },
      { label: "On-road from (est.)", value: (c) => formatINR(c.fromOnRoad) },
      { label: "EMI from (est.)", value: (c) => (c.emiFrom ? `${formatINR(c.emiFrom)}/mo` : "—") },
      { label: "Group deal", value: (c) => (c.openBatchCount ? `${c.openBatchCount} open` : "None open") },
    ],
  },
  {
    title: "Engine & transmission",
    rows: [
      { label: "Body type", value: (c) => bodyLabel(c.body_type) },
      { label: "Fuel options", value: (c) => uniq(c.variants.map((v) => fuelLabel(v.fuel_type))) },
      { label: "Transmissions", value: (c) => uniq(c.variants.map((v) => transmissionLabel(v.transmission))) },
      { label: "Engine (base)", value: (c) => (c.baseVariant?.engine_cc ? `${c.baseVariant.engine_cc} cc` : spec(c, "Battery")) },
      { label: "Max power (base)", value: (c) => spec(c, "Max power") },
      { label: "Max torque (base)", value: (c) => spec(c, "Max torque") },
      { label: "Mileage / range (best)", value: (c) => (c.bestMileage ? `${c.bestMileage} kmpl` : spec(c, "Range")) },
      { label: "Variants", value: (c) => String(c.variants.length) },
    ],
  },
  {
    title: "Dimensions & capacity",
    rows: ["Seating", "Length", "Width", "Height", "Wheelbase", "Boot space", "Fuel tank", "Airbags"].map((k) => ({
      label: k,
      value: (c: CarSummary) => spec(c, k),
    })),
  },
  {
    title: "Ownership",
    rows: [{ label: "Warranty", value: (c) => c.warranty ?? "—" }],
  },
];

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ cars?: string }> }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page py-12">
        <SetupNotice />
      </div>
    );
  }
  const slugs = parseList((await searchParams).cars).slice(0, 3);
  const all = await getCars();
  const picked = slugs.map((s) => all.find((c) => c.slug === s)).filter((c): c is CarSummary => Boolean(c));
  const options = [...all]
    .sort((a, b) => `${a.manufacturer.name} ${a.model_name}`.localeCompare(`${b.manufacturer.name} ${b.model_name}`))
    .map((c) => ({ value: c.slug, label: `${c.manufacturer.name} ${c.model_name}` }));
  const cols = picked.length < 3 ? [...picked, null] : picked;

  return (
    <div className="bg-surface pb-16">
      <CompareSync slugs={picked.map((c) => c.slug)} />
      <div className="container-page pt-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
            <GitCompareArrows className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Compare Cars</h1>
            <p className="text-sm text-muted-foreground">Up to three cars side by side · indicative {siteConfig.launchCity.name} prices</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border bg-white shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[720px] table-fixed text-sm">
            <colgroup>
              <col className="w-48" />
              {cols.map((_, i) => (
                <col key={i} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="p-4 text-left align-bottom text-xs font-semibold text-muted-foreground uppercase">Car</th>
                {cols.map((c, i) => (
                  <th key={c?.slug ?? `add-${i}`} className="border-l p-4 align-top font-normal">
                    {c ? (
                      <div className="relative">
                        <CompareRemove slugs={picked.map((p) => p.slug)} slug={c.slug} />
                        <Link href={`/cars/${c.slug}`} className="group block">
                          <CarVisual car={c} className="aspect-[16/10] rounded-xl" />
                          <p className="mt-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{c.manufacturer.name}</p>
                          <p className="text-lg font-bold text-ink group-hover:text-primary">{c.model_name}</p>
                          <p className="font-extrabold text-primary">{formatPriceLakh(c.fromPrice)} onwards</p>
                        </Link>
                      </div>
                    ) : (
                      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-4">
                        <Plus className="size-6 text-muted-foreground" aria-hidden="true" />
                        <ComparePicker slugs={picked.map((p) => p.slug)} options={options} />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            {picked.length ? (
              SECTIONS.map((section) => (
                <tbody key={section.title}>
                  <tr>
                    <th colSpan={cols.length + 1} className="bg-surface px-4 py-2.5 text-left text-xs font-bold tracking-wider text-ink uppercase">
                      {section.title}
                    </th>
                  </tr>
                  {section.rows.map((row) => {
                    const values = picked.map((c) => row.value(c));
                    const differs = new Set(values).size > 1;
                    return (
                      <tr key={row.label} className="border-t">
                        <th scope="row" className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {row.label}
                        </th>
                        {cols.map((c, i) => (
                          <td key={c?.slug ?? `e-${i}`} className={cn("border-l px-4 py-3 font-medium text-ink", differs && c && "bg-accent/30")}>
                            {c ? values[i] : ""}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              ))
            ) : (
              <tbody>
                <tr>
                  <td colSpan={cols.length + 1} className="p-10 text-center text-muted-foreground">
                    Pick a car above, or use the compare icon on any car in <Link href="/cars" className="font-semibold text-primary hover:underline">New Cars</Link>.
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Rows with differences are highlighted. Base-variant figures are shown where a model has several engines; open a car for every variant.
        </p>
      </div>
    </div>
  );
}
