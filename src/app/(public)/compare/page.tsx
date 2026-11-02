import type { Metadata } from "next";
import Link from "next/link";
import { CarVisual } from "@/components/cars/car-visual";
import { ArrowRight, Fuel, Gauge, IndianRupee, Ruler, ShieldCheck, Sofa } from "lucide-react";
import { CompareSync } from "@/components/cars/compare-controls";
import { CompareWorkspace, type WorkspaceSection, type WorkspaceVerdict } from "@/components/cars/compare-workspace";
import { SetupNotice } from "@/components/shared/setup-notice";
import { type ComparePick, compareHref } from "@/lib/compare-href";
import { type CarSummary, getCars, type VariantWithPrice } from "@/lib/data/cars";
import { parseList } from "@/lib/domain/car-filters";
import { bodyLabel, fuelLabel, transmissionLabel } from "@/lib/domain/car-labels";
import { defaultEmiFor } from "@/lib/emi";
import { isSupabaseConfigured } from "@/lib/env";
import { formatINR, formatPriceLakh } from "@/lib/format";

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

const SECTIONS: { id: string; title: string; icon: React.ReactNode; rows: string[] }[] = [
  { id: "price", title: "Price & running cost", icon: <IndianRupee className="size-4" aria-hidden="true" />, rows: ["Ex-showroom price", "On-road price (est.)", "EMI (est.)", "Group deal"] },
  { id: "engine", title: "Engine & performance", icon: <Gauge className="size-4" aria-hidden="true" />, rows: ["Fuel type", "Transmission", "Engine", "Max power", "Max torque"] },
  { id: "mileage", title: "Mileage & range", icon: <Fuel className="size-4" aria-hidden="true" />, rows: ["Mileage", "Range", "Fuel tank"] },
  { id: "space", title: "Space & comfort", icon: <Sofa className="size-4" aria-hidden="true" />, rows: ["Body type", "Seating capacity", "Boot space", "Ground clearance"] },
  { id: "size", title: "Size", icon: <Ruler className="size-4" aria-hidden="true" />, rows: ["Length", "Width", "Height", "Wheelbase"] },
  { id: "safety", title: "Safety & warranty", icon: <ShieldCheck className="size-4" aria-hidden="true" />, rows: ["Airbags", "Warranty"] },
];
const BADGES: Record<string, string> = {
  "Ex-showroom price": "Lowest price",
  "Max power": "Most powerful",
  "Max torque": "Most torque",
  Mileage: "Best mileage",
  "Boot space": "Most boot space",
  "Seating capacity": "Most seats",
  Airbags: "Most airbags",
};

/** Bar lengths (0–1) so the winner fills the bar; null when the row has no comparable numbers. */
function meterFor(row: Row, cols: Col[], values: string[], best: number) {
  if (best < 0 || !row.num) return null;
  const nums = cols.map((c, i) => (values[i] === dash ? null : row.num!(c)));
  const ok = nums.filter((n): n is number => n !== null && n > 0);
  if (ok.length < 2) return null;
  const max = Math.max(...ok);
  const min = Math.min(...ok);
  return nums.map((n) => (n === null || n <= 0 ? 0 : row.best === "low" ? min / n : n / max));
}

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
    if (!car || picks.some((p) => p.slug === slug)) return;
    const variant = car.variantsWithPrice.find((v) => v.slug === wanted[i]) ?? car.baseVariant ?? car.variantsWithPrice[0];
    if (!variant) return;
    picks.push({ slug, variant: wanted[i] || undefined });
    cols.push({ car, variant });
  });

  const options = [...all]
    .sort((a, b) => `${a.manufacturer.name} ${a.model_name}`.localeCompare(`${b.manufacturer.name} ${b.model_name}`))
    .map((c) => ({ value: c.slug, label: `${c.manufacturer.name} ${c.model_name}`, brand: c.manufacturer.name }));

  const n = cols.length;
  const verdicts: WorkspaceVerdict[] = cols.map(() => ({ wins: 0, badges: [] }));
  const byLabel = new Map(ROWS.map((r) => [r.label, r]));
  const sections: WorkspaceSection[] = SECTIONS.map((sec) => ({
    id: sec.id,
    title: sec.title,
    icon: sec.icon,
    rows: sec.rows
      .map((label) => byLabel.get(label)!)
      .map((row) => {
        const values = cols.map((c) => row.value(c));
        const best = n > 1 ? bestIndex(row, cols, values) : -1;
        if (best >= 0) {
          verdicts[best].wins += 1;
          if (BADGES[row.label]) verdicts[best].badges.push(BADGES[row.label]);
        }
        return { label: row.label, values, best, differs: n > 1 && new Set(values).size > 1, meter: meterFor(row, cols, values, best) };
      })
      .filter((r) => r.values.some((v) => v !== dash)),
  })).filter((s) => s.rows.length);

  const cars = cols.map((c) => ({
    slug: c.car.slug,
    brand: c.car.manufacturer.name,
    model: c.car.model_name,
    priceRange:
      c.car.fromPrice && c.car.toPrice && c.car.toPrice !== c.car.fromPrice
        ? `${formatPriceLakh(c.car.fromPrice)} – ${formatPriceLakh(c.car.toPrice)}`
        : formatPriceLakh(c.car.fromPrice),
    variantPrice: formatPriceLakh(c.variant.exShowroom),
    href: `/cars/${c.car.slug}`,
    variant: c.variant.slug,
    variants: c.car.variantsWithPrice.map((v) => ({ value: v.slug, label: v.name })),
    visual: <CarVisual car={c.car} className="aspect-[16/10]" />,
  }));

  const popular = POPULAR.filter(([a, b]) => bySlug.has(a) && bySlug.has(b)).slice(0, 8);

  return (
    <div className="bg-surface pb-16">
      <CompareSync slugs={picks.map((p) => p.slug)} />

      <section className="border-b bg-white">
        <div className="container-page py-8 sm:py-10">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <Link href="/" className="hover:text-primary">Home</Link> <span aria-hidden="true">/</span> <span className="text-ink">Compare cars</span>
          </nav>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Compare cars, <span className="text-primary">side by side</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Pick up to {MAX} cars and any variant. We line up price, EMI, engine, mileage, space and safety, and highlight which car wins each spec.
          </p>
          <ol className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
            {["Search a car", "Choose the variant", "See who wins each spec"].map((t, i) => (
              <li key={t} className="flex items-center gap-2">
                <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${i < Math.min(n, 2) + (n >= 2 ? 1 : 0) ? "bg-primary text-white" : "bg-surface text-muted-foreground"}`}>
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="container-page mt-6">
        <CompareWorkspace picks={picks} cars={cars} options={options} sections={sections} verdicts={verdicts} />

        {n ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Prices are indicative ex-showroom figures; on-road and EMI are estimates (EMI uses the site&apos;s default down payment, rate and tenure).
            Mileage figures are ARAI/claimed. Confirm the final price with the dealership.
          </p>
        ) : null}

        {popular.length ? (
          <section aria-labelledby="popular-compare" className="mt-10">
            <h2 id="popular-compare" className="text-lg font-bold text-ink sm:text-xl">
              {n ? "More comparisons buyers make" : "Start with a popular comparison"}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map(([a, b]) => {
                const ca = bySlug.get(a)!;
                const cb = bySlug.get(b)!;
                return (
                  <li key={`${a}-${b}`}>
                    <Link
                      href={compareHref([{ slug: a }, { slug: b }])}
                      className="group block overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary/40"
                    >
                      <div className="relative grid grid-cols-2 gap-1 bg-surface p-2">
                        <CarVisual car={ca} className="aspect-[16/10] rounded-lg" />
                        <CarVisual car={cb} className="aspect-[16/10] rounded-lg" />
                        <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white ring-4 ring-white">
                          VS
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-ink">
                          {ca.model_name} <span className="font-normal text-muted-foreground">vs</span> {cb.model_name}
                        </p>
                        <p className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {formatPriceLakh(ca.fromPrice)} · {formatPriceLakh(cb.fromPrice)}
                          </span>
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                        </p>
                      </div>
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
