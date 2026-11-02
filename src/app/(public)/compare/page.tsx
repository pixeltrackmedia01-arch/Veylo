import type { Metadata } from "next";
import Link from "next/link";
import { CarVisual } from "@/components/cars/car-visual";
import {
  CompareAdd,
  CompareDiffToggle,
  type ComparePick,
  CompareRemove,
  CompareSync,
  CompareVariant,
  compareHref,
} from "@/components/cars/compare-controls";
import { SetupNotice } from "@/components/shared/setup-notice";
import { type CarSummary, getCars, type VariantWithPrice } from "@/lib/data/cars";
import { parseList } from "@/lib/domain/car-filters";
import { bodyLabel, fuelLabel, transmissionLabel } from "@/lib/domain/car-labels";
import { defaultEmiFor } from "@/lib/emi";
import { isSupabaseConfigured } from "@/lib/env";
import { formatINR, formatPriceLakh } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Compare Cars — Price, Mileage, Specs & Features Side by Side",
  description:
    "Compare up to four new cars side by side: ex-showroom and on-road price, engine, power, torque, mileage, seating, boot space and more, variant by variant.",
  alternates: { canonical: "/compare" },
};

const MAX = 4;

type Col = { car: CarSummary; variant: VariantWithPrice };
/** "best" says which value wins in a row: the lowest (prices) or the highest (power, space…). */
type Row = { label: string; value: (c: Col) => string; num?: (c: Col) => number | null; best?: "low" | "high" };

const dash = "—";
const spec = (c: Col, key: string) => {
  const v = c.variant.specifications?.[key];
  return v === undefined || v === null || v === "" ? dash : String(v);
};
const firstNumber = (s: string) => {
  const m = s.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};
/** Power in PS whatever unit the brand uses (PS, bhp or kW). */
const powerPs = (s: string) => {
  const ps = s.match(/([\d.]+)\s*(?:PS|ps)\b/);
  if (ps) return Number(ps[1]);
  const kw = s.match(/([\d.]+)\s*kW/i);
  if (kw) return Number(kw[1]) * 1.36;
  const bhp = s.match(/([\d.]+)\s*(?:bhp|hp)/i);
  return bhp ? Number(bhp[1]) * 1.014 : null;
};
const unitOf = (s: string) => s.replace(/[\d.,\s()]/g, "").toLowerCase();

const ROWS: Row[] = [
  { label: "Ex-showroom price", value: (c) => formatPriceLakh(c.variant.exShowroom), num: (c) => c.variant.exShowroom, best: "low" },
  { label: "On-road price (est.)", value: (c) => (c.variant.onRoad ? formatINR(c.variant.onRoad) : dash), num: (c) => c.variant.onRoad, best: "low" },
  {
    label: "EMI (est.)",
    value: (c) => {
      const base = c.variant.onRoad ?? c.variant.exShowroom;
      return base ? `${formatINR(defaultEmiFor(base))}/mo` : dash;
    },
    num: (c) => {
      const base = c.variant.onRoad ?? c.variant.exShowroom;
      return base ? defaultEmiFor(base) : null;
    },
    best: "low",
  },
  { label: "Body type", value: (c) => bodyLabel(c.car.body_type) },
  { label: "Fuel type", value: (c) => fuelLabel(c.variant.fuel_type) },
  { label: "Transmission", value: (c) => transmissionLabel(c.variant.transmission) },
  { label: "Engine", value: (c) => (c.variant.engine_cc ? `${c.variant.engine_cc} cc` : spec(c, "Battery")) },
  { label: "Max power", value: (c) => spec(c, "Max power"), num: (c) => powerPs(spec(c, "Max power")), best: "high" },
  { label: "Max torque", value: (c) => spec(c, "Max torque"), num: (c) => firstNumber(spec(c, "Max torque")), best: "high" },
  { label: "Mileage", value: (c) => spec(c, "Mileage"), num: (c) => firstNumber(spec(c, "Mileage")), best: "high" },
  { label: "Range", value: (c) => spec(c, "Range"), num: (c) => firstNumber(spec(c, "Range")), best: "high" },
  { label: "Seating capacity", value: (c) => spec(c, "Seating"), num: (c) => firstNumber(spec(c, "Seating")), best: "high" },
  { label: "Boot space", value: (c) => spec(c, "Boot space"), num: (c) => firstNumber(spec(c, "Boot space")), best: "high" },
  { label: "Ground clearance", value: (c) => spec(c, "Ground clearance"), num: (c) => firstNumber(spec(c, "Ground clearance")), best: "high" },
  { label: "Fuel tank", value: (c) => spec(c, "Fuel tank") },
  { label: "Airbags", value: (c) => spec(c, "Airbags"), num: (c) => firstNumber(spec(c, "Airbags")), best: "high" },
  { label: "Length", value: (c) => spec(c, "Length") },
  { label: "Width", value: (c) => spec(c, "Width") },
  { label: "Height", value: (c) => spec(c, "Height") },
  { label: "Wheelbase", value: (c) => spec(c, "Wheelbase"), num: (c) => firstNumber(spec(c, "Wheelbase")), best: "high" },
  { label: "Warranty", value: (c) => c.car.warranty ?? dash },
  { label: "Group deal", value: (c) => (c.car.openBatchCount ? `${c.car.openBatchCount} open` : "None open") },
];

/** Index of the winning column, only when 2+ columns have comparable numbers that differ. */
function bestIndex(row: Row, cols: Col[], values: string[]) {
  if (!row.best || !row.num) return -1;
  const nums = cols.map((c, i) => (values[i] === dash ? null : row.num!(c)));
  const present = nums.map((n, i) => ({ n, i })).filter((x): x is { n: number; i: number } => x.n !== null && Number.isFinite(x.n));
  if (present.length < 2) return -1;
  // Mileage in km/l vs km/kg (or kWh) is not comparable.
  if (row.label === "Mileage" && new Set(present.map((x) => unitOf(values[x.i]))).size > 1) return -1;
  const target = row.best === "low" ? Math.min(...present.map((x) => x.n)) : Math.max(...present.map((x) => x.n));
  const winners = present.filter((x) => x.n === target);
  return winners.length === 1 ? winners[0].i : -1;
}

const POPULAR: [string, string][] = [
  ["hyundai-creta", "kia-seltos"],
  ["maruti-suzuki-brezza", "hyundai-venue"],
  ["tata-nexon", "maruti-suzuki-brezza"],
  ["maruti-suzuki-swift", "hyundai-grand-i10-nios"],
  ["mahindra-xuv-3xo", "kia-sonet"],
  ["maruti-suzuki-dzire", "honda-amaze"],
  ["mahindra-scorpio-n", "mahindra-xuv-7xo"],
  ["toyota-innova-hycross", "maruti-suzuki-invicto"],
  ["skoda-kylaq", "maruti-suzuki-brezza"],
  ["jeep-compass", "hyundai-creta"],
];

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ cars?: string; v?: string }> }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page py-12">
        <SetupNotice />
      </div>
    );
  }
  const sp = await searchParams;
  const slugs = parseList(sp.cars).slice(0, MAX);
  const wanted = (sp.v ?? "").split(",");
  const all = await getCars();
  const bySlug = new Map(all.map((c) => [c.slug, c]));

  const picks: ComparePick[] = [];
  const cols: Col[] = [];
  slugs.forEach((slug, i) => {
    const car = bySlug.get(slug);
    if (!car) return;
    const variant = car.variantsWithPrice.find((v) => v.slug === wanted[i]) ?? car.baseVariant ?? car.variantsWithPrice[0];
    if (!variant) return;
    picks.push({ slug, variant: wanted[i] || undefined });
    cols.push({ car, variant });
  });

  const options = [...all]
    .sort((a, b) => `${a.manufacturer.name} ${a.model_name}`.localeCompare(`${b.manufacturer.name} ${b.model_name}`))
    .map((c) => ({ value: c.slug, label: `${c.manufacturer.name} ${c.model_name}` }));
  const canAdd = cols.length < MAX;
  const rows = ROWS.map((row) => ({ row, values: cols.map((c) => row.value(c)) })).filter((r) => r.values.some((v) => v !== dash));
  const popular = POPULAR.filter(([a, b]) => bySlug.has(a) && bySlug.has(b)).slice(0, 8);

  return (
    <div className="bg-surface pb-16">
      <CompareSync slugs={picks.map((p) => p.slug)} />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(225,29,46,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(37,99,235,0.25),transparent_50%)]" aria-hidden="true" />
        <div className="container-page relative py-10 sm:py-14">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-primary uppercase">
            <span className="h-px w-8 bg-primary" aria-hidden="true" /> Compare
          </p>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Compare Cars</h1>
          <p className="mt-2 max-w-2xl text-white/75">
            Put up to {MAX} cars side by side: price, engine, mileage, space and more, variant by variant.
          </p>
        </div>
      </section>

      <div className="container-page mt-6">
        <CompareDiffToggle>
          <div className="mt-4 overflow-x-auto rounded-2xl border bg-white shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-44" />
                {cols.map((c) => (
                  <col key={c.car.slug} />
                ))}
                {canAdd ? <col /> : null}
              </colgroup>
              <thead>
                <tr>
                  <th className="p-4 text-left align-bottom">
                    <p className="font-bold text-ink">Car models</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {cols.length} of {MAX} selected
                    </p>
                  </th>
                  {cols.map((c, i) => (
                    <th key={c.car.slug} className="border-l p-4 align-top font-normal">
                      <div className="relative">
                        <CompareRemove picks={picks} index={i} />
                        <Link href={`/cars/${c.car.slug}`} className="group block">
                          <CarVisual car={c.car} className="aspect-[16/10] rounded-xl" />
                          <p className="mt-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">{c.car.manufacturer.name}</p>
                          <p className="text-left font-bold text-ink group-hover:text-primary">{c.car.model_name}</p>
                        </Link>
                        <div className="mt-2">
                          <CompareVariant
                            picks={picks}
                            index={i}
                            options={c.car.variantsWithPrice.map((v) => ({ value: v.slug, label: v.name }))}
                          />
                        </div>
                      </div>
                    </th>
                  ))}
                  {canAdd ? (
                    <th className="border-l p-4 align-top font-normal">
                      <CompareAdd picks={picks} options={options} />
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {cols.length
                  ? rows.map(({ row, values }) => {
                      const differs = new Set(values).size > 1;
                      const best = cols.length > 1 ? bestIndex(row, cols, values) : -1;
                      return (
                        <tr key={row.label} className={cn("border-t", !differs && "group-data-[only-diff]/diff:hidden")}>
                          <th
                            scope="row"
                            className={cn(
                              "border-l-[3px] px-4 py-3 text-left font-medium text-ink",
                              differs && cols.length > 1 ? "border-l-primary" : "border-l-transparent",
                            )}
                          >
                            {row.label}
                          </th>
                          {values.map((v, i) => (
                            <td key={cols[i].car.slug} className={cn("border-l px-4 py-3 text-ink", i === best && "font-bold text-emerald-600")}>
                              {v}
                            </td>
                          ))}
                          {canAdd ? <td className="border-l" /> : null}
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </CompareDiffToggle>

        {cols.length ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Rows marked with a red line differ between these cars. Values in <span className="font-semibold text-emerald-600">green</span> are the best in that
            row. Prices are indicative ex-showroom figures; EMI assumes the site&apos;s default down payment, rate and tenure.
          </p>
        ) : null}

        {popular.length ? (
          <section aria-labelledby="popular-compare" className="mt-10">
            <h2 id="popular-compare" className="text-lg font-bold sm:text-xl">
              Popular car comparisons
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map(([a, b]) => {
                const ca = bySlug.get(a)!;
                const cb = bySlug.get(b)!;
                return (
                  <li key={`${a}-${b}`}>
                    <Link
                      href={compareHref([{ slug: a }, { slug: b }])}
                      className="block rounded-xl border bg-white p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/50"
                    >
                      <p className="text-sm font-semibold text-ink">
                        {ca.manufacturer.name} {ca.model_name} <span className="text-muted-foreground">vs</span> {cb.manufacturer.name} {cb.model_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatPriceLakh(ca.fromPrice)} vs {formatPriceLakh(cb.fromPrice)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
