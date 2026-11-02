"use client";

import { Car, ChevronDown, Info, PenLine, RotateCcw, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { CarSearch } from "@/components/cars/compare-workspace";
import { LeadDialog, type LeadTarget } from "@/components/cars/lead-dialog";
import { siteConfig } from "@/config/site";
import { amortisationByYear, emiSummary, monthlyEmi } from "@/lib/emi";
import { formatINR, formatINRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export type EmiCarOption = {
  slug: string;
  id: string;
  label: string;
  brand: string;
  variants: { id: string; name: string; onRoad: number | null; exShowroom: number | null }[];
};

const D = siteConfig.emi;
const PRICE_MIN = 100000;
const PRICE_MAX = 10000000;
const TENURES = [12, 24, 36, 48, 60, 72, 84];

/** Slider with a typed value box and quick presets. */
function Control({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  display,
  unit,
  presets,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  display: (n: number) => string;
  unit: string;
  presets?: { label: string; value: number }[];
}) {
  const id = useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <label htmlFor={id} className="text-sm font-semibold text-ink">
            {label}
          </label>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex h-10 items-center rounded-xl border border-input bg-white px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
          {unit === "₹" ? <span className="pr-1 text-sm text-muted-foreground">₹</span> : null}
          <input
            type="number"
            inputMode="decimal"
            aria-label={`${label}, exact value`}
            value={Number.isFinite(value) ? value : 0}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(clamp(n));
            }}
            className="w-24 bg-transparent text-right text-sm font-bold text-ink focus:outline-none sm:w-28"
          />
          {unit !== "₹" ? <span className="pl-1 text-xs text-muted-foreground">{unit}</span> : null}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full accent-[var(--brand-primary)]"
        style={{ background: `linear-gradient(to right, var(--brand-primary) ${pct}%, var(--secondary) ${pct}%)` }}
      />
      {presets ? (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(clamp(p.value))}
              aria-pressed={value === p.value}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                value === p.value ? "border-primary bg-primary text-white" : "bg-white text-ink hover:border-primary/50",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{display(min)}</span>
          <span>{display(max)}</span>
        </div>
      )}
    </div>
  );
}

/** Standalone EMI planner: pick a car (or type a price), tune the loan, see the cost and alternatives. */
export function EmiPageCalculator({ cars, initialCar }: { cars: EmiCarOption[]; initialCar?: string }) {
  const [carSlug, setCarSlug] = useState(initialCar ?? "");
  const car = cars.find((c) => c.slug === carSlug);
  const [variantId, setVariantId] = useState(car?.variants[0]?.id ?? "");
  const variant = car?.variants.find((v) => v.id === variantId) ?? car?.variants[0];
  const variantPrice = variant?.onRoad ?? variant?.exShowroom ?? null;

  const [manualPrice, setManualPrice] = useState(800000);
  const [override, setOverride] = useState<number | null>(null);
  const price = override ?? variantPrice ?? manualPrice;
  const setPrice = (n: number) => (car ? setOverride(n) : setManualPrice(n));

  const [downPct, setDownPct] = useState<number>(D.downPaymentPct);
  const [rate, setRate] = useState<number>(D.annualRatePct);
  const [months, setMonths] = useState<number>(D.tenureMonths);
  const [showTable, setShowTable] = useState(false);
  const [lead, setLead] = useState<LeadTarget | null>(null);

  const down = Math.round((price * downPct) / 100);
  const principal = Math.max(0, price - down);
  const summary = emiSummary({ principal, annualRatePct: rate, tenureMonths: months });
  const years = useMemo(() => amortisationByYear({ principal, annualRatePct: rate, tenureMonths: months }), [principal, rate, months]);
  const totalCost = summary.totalPayable + down;
  const interestShare = totalCost ? summary.totalInterest / totalCost : 0;
  const downShare = totalCost ? down / totalCost : 0;
  const maxYear = Math.max(1, ...years.map((y) => y.principal + y.interest));
  // Rule of thumb: keep the car EMI within about 15% of take-home pay.
  const incomeNeeded = Math.ceil(summary.emi / 0.15 / 1000) * 1000;

  const pickCar = (slug: string) => {
    setCarSlug(slug);
    setVariantId(cars.find((c) => c.slug === slug)?.variants[0]?.id ?? "");
    setOverride(null);
  };
  const reset = () => {
    setDownPct(D.downPaymentPct);
    setRate(D.annualRatePct);
    setMonths(D.tenureMonths);
    setOverride(null);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      {/* Inputs */}
      <div className="min-w-0 space-y-5">
        <section aria-labelledby="emi-step-car" className="rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="emi-step-car" className="flex items-center gap-2 font-bold text-ink">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs text-white">1</span> Which car?
            </h2>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          {car ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
              <div className="flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
                  <Car className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{car.brand}</p>
                  <p className="truncate text-sm font-bold text-ink">{car.label.replace(`${car.brand} `, "")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => pickCar("")}
                  aria-label="Clear car and enter a price instead"
                  className="ml-auto flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-white hover:text-primary"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <label className="block">
                <span className="sr-only">Variant</span>
                <span className="relative block">
                  <select
                    value={variant?.id ?? ""}
                    onChange={(e) => {
                      setVariantId(e.target.value);
                      setOverride(null);
                    }}
                    className="h-full min-h-14 w-full appearance-none rounded-xl border border-input bg-white pr-9 pl-3 text-sm font-medium text-ink hover:border-primary/40 focus:border-primary focus:outline-none"
                  >
                    {car.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                        {v.onRoad ? ` · ≈ ${formatINRCompact(v.onRoad)} on-road` : v.exShowroom ? ` · ${formatINRCompact(v.exShowroom)}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                </span>
              </label>
            </div>
          ) : (
            <div className="mt-4">
              <CarSearch options={cars.map((c) => ({ value: c.slug, label: c.label, brand: c.brand }))} taken={new Set()} onPick={pickCar} />
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <PenLine className="size-3.5" aria-hidden="true" /> Or skip this and type any price below.
              </p>
            </div>
          )}
        </section>

        <section aria-labelledby="emi-step-loan" className="space-y-7 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="emi-step-loan" className="flex items-center gap-2 font-bold text-ink">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs text-white">2</span> Shape your loan
            </h2>
            <button type="button" onClick={reset} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
              <RotateCcw className="size-3.5" aria-hidden="true" /> Reset
            </button>
          </div>
          <Control
            label={car ? "On-road price" : "Car price"}
            hint={car && variant ? `${variant.name}${override ? " · edited" : variant.onRoad ? " · estimated on-road" : " · ex-showroom"}` : "Use the on-road price for the most accurate EMI"}
            value={price}
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={10000}
            onChange={setPrice}
            display={formatINRCompact}
            unit="₹"
          />
          <Control
            label="Down payment"
            hint={`${formatINR(down)} paid upfront`}
            value={downPct}
            min={0}
            max={90}
            step={5}
            onChange={setDownPct}
            display={(n) => `${n}%`}
            unit="%"
            presets={[0, 10, 20, 30, 50].map((v) => ({ label: `${v}%`, value: v }))}
          />
          <Control
            label="Interest rate"
            hint="Per year, reducing balance"
            value={rate}
            min={6}
            max={18}
            step={0.1}
            onChange={(n) => setRate(Math.round(n * 10) / 10)}
            display={(n) => `${n}%`}
            unit="% p.a."
            presets={[8.5, 9, 9.5, 10.5, 12].map((v) => ({ label: `${v}%`, value: v }))}
          />
          <Control
            label="Loan tenure"
            hint={`${months} monthly instalments`}
            value={months}
            min={12}
            max={84}
            step={12}
            onChange={setMonths}
            display={(n) => `${n / 12} yr`}
            unit="months"
            presets={TENURES.map((t) => ({ label: `${t / 12} yr`, value: t }))}
          />
        </section>

        <section aria-labelledby="emi-tenures" className="rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 id="emi-tenures" className="font-bold text-ink">
            Same loan, different tenures
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">A longer loan lowers the EMI but you pay more interest. Tap a row to use it.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Tenure</th>
                  <th className="pb-2 font-medium">Monthly EMI</th>
                  <th className="pb-2 font-medium">Total interest</th>
                  <th className="pb-2 text-right font-medium">vs. selected</th>
                </tr>
              </thead>
              <tbody>
                {TENURES.map((t) => {
                  const e = monthlyEmi({ principal, annualRatePct: rate, tenureMonths: t });
                  const interest = Math.max(0, e * t - principal);
                  const diff = interest - summary.totalInterest;
                  const active = t === months;
                  return (
                    <tr
                      key={t}
                      onClick={() => setMonths(t)}
                      className={cn("cursor-pointer border-t transition-colors", active ? "bg-primary/5" : "hover:bg-surface")}
                    >
                      <td className="py-2.5">
                        <button type="button" onClick={() => setMonths(t)} aria-pressed={active} className={cn("font-semibold", active ? "text-primary" : "text-ink")}>
                          {t / 12} {t === 12 ? "year" : "years"}
                        </button>
                      </td>
                      <td className="py-2.5 font-semibold text-ink">{formatINR(e)}</td>
                      <td className="py-2.5 text-ink">{formatINR(interest)}</td>
                      <td className={cn("py-2.5 text-right text-xs font-semibold", active ? "text-muted-foreground" : diff < 0 ? "text-emerald-600" : "text-amber-600")}>
                        {active ? "Selected" : `${diff < 0 ? "Save" : "+"} ${formatINRCompact(Math.abs(diff))}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="emi-schedule" className="rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 id="emi-schedule" className="font-bold text-ink">
            How you repay, year by year
          </h2>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-primary" /> Principal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-amber-400" /> Interest
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {years.map((y) => (
              <li key={y.year} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 text-xs">
                <span className="font-medium text-muted-foreground">Year {y.year}</span>
                <span className="flex h-3 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                  <span className="bg-primary" style={{ width: `${(y.principal / maxYear) * 100}%` }} />
                  <span className="bg-amber-400" style={{ width: `${(y.interest / maxYear) * 100}%` }} />
                </span>
                <span className="w-24 text-right text-muted-foreground">
                  Left <span className="font-semibold text-ink">{formatINRCompact(y.balance)}</span>
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            aria-expanded={showTable}
            className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            {showTable ? "Hide" : "Show"} the full table <ChevronDown className={cn("size-4 transition-transform", showTable && "rotate-180")} aria-hidden="true" />
          </button>
          {showTable ? (
            <div className="mt-3 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="bg-surface text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Year</th>
                    <th className="px-4 py-2 font-medium">Principal paid</th>
                    <th className="px-4 py-2 font-medium">Interest paid</th>
                    <th className="px-4 py-2 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.year} className="border-t">
                      <td className="px-4 py-2">{y.year}</td>
                      <td className="px-4 py-2">{formatINR(y.principal)}</td>
                      <td className="px-4 py-2">{formatINR(y.interest)}</td>
                      <td className="px-4 py-2">{formatINR(y.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>

      {/* Result, pinned on desktop */}
      <aside id="emi-result" aria-label="Your EMI" className="scroll-mt-20 lg:sticky lg:top-20">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-card)]">
          <div className="bg-ink p-5 text-white sm:p-6">
            <p className="text-sm text-white/70">Your monthly EMI</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl" aria-live="polite">
              {formatINR(summary.emi)}
            </p>
            <p className="mt-1 text-xs text-white/60">
              for {months / 12} {months === 12 ? "year" : "years"} at {rate}% on a loan of {formatINRCompact(principal)}
            </p>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Where your money goes</p>
              <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                <span className="bg-ink/70" style={{ width: `${downShare * 100}%` }} />
                <span className="bg-primary" style={{ width: `${(1 - downShare - interestShare) * 100}%` }} />
                <span className="bg-amber-400" style={{ width: `${interestShare * 100}%` }} />
              </div>
            </div>
            <dl className="space-y-2.5 text-sm">
              {[
                { k: "Down payment", v: down, dot: "bg-ink/70" },
                { k: "Loan amount", v: principal, dot: "bg-primary" },
                { k: "Total interest", v: summary.totalInterest, dot: "bg-amber-400" },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <span className={cn("size-2.5 rounded-full", r.dot)} /> {r.k}
                  </dt>
                  <dd className="font-semibold text-ink">{formatINR(r.v)}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t pt-2.5">
                <dt className="font-semibold text-ink">Total cost of the car</dt>
                <dd className="text-base font-extrabold text-ink">{formatINR(totalCost)}</dd>
              </div>
            </dl>
            {summary.emi > 0 ? (
              <p className="flex gap-2 rounded-xl bg-surface p-3 text-xs leading-5 text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  To keep this EMI under 15% of your income, aim for a monthly take-home of about{" "}
                  <strong className="text-ink">{formatINR(incomeNeeded)}</strong>.
                </span>
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setLead({ kind: "car_loan", vehicleId: car?.id, variantId: variant?.id, label: car ? `${car.label} ${variant?.name ?? ""}` : undefined })}
              className="h-12 w-full rounded-xl bg-primary font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              Get car loan offers
            </button>
            <p className="text-center text-[11px] leading-4 text-muted-foreground">
              Estimate only. Lenders set the final rate, fees and eligibility.
            </p>
          </div>
        </div>
      </aside>
      {/* Phones: keep the live EMI in view while adjusting the sliders */}
      <a
        href="#emi-result"
        className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-white shadow-2xl lg:hidden"
      >
        <span>
          <span className="block text-[11px] text-white/60">Monthly EMI</span>
          <span className="block text-lg font-extrabold">{formatINR(summary.emi)}</span>
        </span>
        <span className="rounded-xl bg-primary px-3 py-2 text-xs font-bold">See breakdown</span>
      </a>
      <LeadDialog target={lead} onOpenChange={(o) => !o && setLead(null)} />
    </div>
  );
}
