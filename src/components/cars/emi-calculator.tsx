"use client";

import { ChevronDown } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { siteConfig } from "@/config/site";
import { amortisationByYear, emiSummary } from "@/lib/emi";
import { formatINR, formatINRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

function Field({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
  suffix?: string;
}) {
  const id = useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <div className="flex items-center rounded-lg border border-input bg-white px-2 focus-within:border-primary">
          <input
            type="number"
            inputMode="decimal"
            aria-label={`${label} value`}
            value={Number.isFinite(value) ? value : 0}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
            }}
            className="h-9 w-28 bg-transparent text-right text-sm font-semibold text-ink focus:outline-none"
          />
          {suffix ? <span className="pl-1 text-xs text-muted-foreground">{suffix}</span> : null}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full accent-[var(--brand-primary)]"
        style={{ background: `linear-gradient(to right, var(--brand-primary) ${pct}%, var(--secondary) ${pct}%)` }}
      />
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function Donut({ principal, interest }: { principal: number; interest: number }) {
  const total = principal + interest || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  const p = (principal / total) * c;
  return (
    <svg viewBox="0 0 140 140" className="size-36 shrink-0" role="img" aria-label={`Principal ${Math.round((principal / total) * 100)}%, interest ${Math.round((interest / total) * 100)}%`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#fbd5d9" strokeWidth="18" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="var(--brand-primary)"
        strokeWidth="18"
        strokeDasharray={`${p} ${c - p}`}
        transform="rotate(-90 70 70)"
        strokeLinecap="butt"
        className="transition-all duration-500"
      />
      <text x="70" y="66" textAnchor="middle" className="fill-muted-foreground text-[10px]">
        Principal
      </text>
      <text x="70" y="82" textAnchor="middle" className="fill-ink text-[14px] font-bold">
        {Math.round((principal / total) * 100)}%
      </text>
    </svg>
  );
}

export function EmiCalculator({
  price,
  priceLabel = "Vehicle price (on-road)",
  minPrice = 100000,
  maxPrice = 10000000,
  editablePrice = true,
  onLoanEnquiry,
  className,
}: {
  price: number;
  priceLabel?: string;
  minPrice?: number;
  maxPrice?: number;
  editablePrice?: boolean;
  onLoanEnquiry?: () => void;
  className?: string;
}) {
  const [carPrice, setCarPrice] = useState(price);
  const [priceSeed, setPriceSeed] = useState(price);
  // Follow the selected variant's price when the parent changes it.
  if (price !== priceSeed) {
    setPriceSeed(price);
    setCarPrice(price);
  }
  const [downPct, setDownPct] = useState<number>(siteConfig.emi.downPaymentPct);
  const [rate, setRate] = useState<number>(siteConfig.emi.annualRatePct);
  const [months, setMonths] = useState<number>(siteConfig.emi.tenureMonths);
  const [showTable, setShowTable] = useState(false);

  const down = Math.round((carPrice * downPct) / 100);
  const principal = Math.max(0, carPrice - down);
  const input = { principal, annualRatePct: rate, tenureMonths: months };
  const summary = emiSummary(input);
  const rows = useMemo(() => amortisationByYear({ principal, annualRatePct: rate, tenureMonths: months }), [principal, rate, months]);

  return (
    <div className={cn("grid gap-6 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6 lg:grid-cols-[1.2fr_1fr]", className)}>
      <div className="space-y-6">
        {editablePrice ? (
          <Field label={priceLabel} value={carPrice} min={minPrice} max={maxPrice} step={10000} onChange={setCarPrice} format={formatINRCompact} suffix="₹" />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">{priceLabel}</span>
            <span className="font-bold text-ink">{formatINR(carPrice)}</span>
          </div>
        )}
        <Field label="Down payment" value={downPct} min={0} max={90} step={5} onChange={setDownPct} format={(n) => `${n}%`} suffix="%" />
        <Field label="Interest rate (p.a.)" value={rate} min={6} max={18} step={0.1} onChange={(n) => setRate(Math.round(n * 10) / 10)} format={(n) => `${n}%`} suffix="%" />
        <Field label="Loan tenure" value={months} min={12} max={84} step={12} onChange={setMonths} format={(n) => `${n / 12} yrs`} suffix="months" />
      </div>

      <div className="flex flex-col rounded-2xl bg-surface p-5">
        <p className="text-sm text-muted-foreground">Monthly EMI</p>
        <p className="font-display text-4xl font-extrabold text-primary" aria-live="polite">
          {formatINR(summary.emi)}
          <span className="text-base font-semibold text-muted-foreground">/mo</span>
        </p>
        <div className="mt-4 flex items-center gap-5">
          <Donut principal={principal} interest={summary.totalInterest} />
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 rounded-full bg-primary" /> Loan amount
              </dt>
              <dd className="font-semibold text-ink">{formatINR(principal)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 rounded-full bg-[#fbd5d9]" /> Total interest
              </dt>
              <dd className="font-semibold text-ink">{formatINR(summary.totalInterest)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total payable</dt>
              <dd className="font-semibold text-ink">{formatINR(summary.totalPayable + down)}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Down payment {formatINR(down)} · {months} months at {rate}%</p>
        {onLoanEnquiry ? (
          <button
            type="button"
            onClick={onLoanEnquiry}
            className="mt-4 h-11 rounded-xl bg-primary font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
          >
            Get loan offers
          </button>
        ) : null}
      </div>

      <div className="lg:col-span-2">
        <button
          type="button"
          onClick={() => setShowTable((s) => !s)}
          aria-expanded={showTable}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Year-by-year breakdown <ChevronDown className={cn("size-4 transition-transform", showTable && "rotate-180")} aria-hidden="true" />
        </button>
        {showTable ? (
          <div className="mt-3 overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 font-semibold">Year</th>
                  <th className="px-4 py-2 font-semibold">Principal paid</th>
                  <th className="px-4 py-2 font-semibold">Interest paid</th>
                  <th className="px-4 py-2 font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.year} className="border-t">
                    <td className="px-4 py-2">{r.year}</td>
                    <td className="px-4 py-2">{formatINR(r.principal)}</td>
                    <td className="px-4 py-2">{formatINR(r.interest)}</td>
                    <td className="px-4 py-2">{formatINR(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          This is an estimate using a reducing-balance formula. Your actual EMI depends on the lender, your credit profile, processing fees and
          the final on-road price.
        </p>
      </div>
    </div>
  );
}
