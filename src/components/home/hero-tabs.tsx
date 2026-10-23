"use client";

import { ArrowRight, GitCompareArrows, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

const BUDGETS: Option[] = [
  { value: "u5", label: "Under ₹5 Lakh" },
  { value: "5-10", label: "₹5 - 10 Lakh" },
  { value: "10-15", label: "₹10 - 15 Lakh" },
  { value: "15-20", label: "₹15 - 20 Lakh" },
  { value: "20-30", label: "₹20 - 30 Lakh" },
  { value: "30p", label: "Above ₹30 Lakh" },
];

const TABS = [
  { key: "groups", label: "Group Deals" },
  { key: "cars", label: "New Cars" },
  { key: "compare", label: "Compare" },
] as const;

const selectClass =
  "h-12 w-full rounded-xl border border-input bg-white px-3 text-[15px] text-ink transition-colors hover:border-primary/50 focus:border-primary focus:outline-none";

export function HeroTabs({ brands, cars, openGroups }: { brands: Option[]; cars: Option[]; openGroups: number }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("groups");
  const [brand, setBrand] = useState("");
  const [budget, setBudget] = useState("");
  const [carA, setCarA] = useState("");
  const [carB, setCarB] = useState("");

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white/95 p-2 text-left shadow-2xl shadow-black/40 ring-1 ring-white/20 backdrop-blur">
      <div role="tablist" aria-label="What would you like to do?" className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            id={`hero-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`hero-panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={cn(
              "h-10 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all sm:text-sm",
              tab === t.key ? "bg-white text-ink shadow-sm" : "text-muted-foreground hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        {tab === "groups" ? (
          <div id="hero-panel-groups" role="tabpanel" aria-labelledby="hero-tab-groups" className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-medium text-ink">Join a group for the car you want. More buyers, better dealer offer.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Free to join. You decide whether to buy.
                {openGroups ? ` ${openGroups} groups open right now.` : ""}
              </p>
            </div>
            <Link
              href="/groups"
              className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/40 sm:w-auto"
            >
              See Open Groups <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}

        {tab === "cars" ? (
          <form
            id="hero-panel-cars"
            role="tabpanel"
            aria-labelledby="hero-tab-cars"
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              const params = new URLSearchParams();
              if (brand) params.set("brand", brand);
              if (budget) params.set("budget", budget);
              router.push(`/cars${params.size ? `?${params}` : ""}`);
            }}
          >
            <label className="sr-only" htmlFor="hero-brand">Brand</label>
            <select id="hero-brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={selectClass}>
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="hero-budget">Budget</label>
            <select id="hero-budget" value={budget} onChange={(e) => setBudget(e.target.value)} className={selectClass}>
              <option value="">Any budget</option>
              {BUDGETS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              <Search className="size-4" aria-hidden="true" /> Search Cars
            </button>
          </form>
        ) : null}

        {tab === "compare" ? (
          <form
            id="hero-panel-compare"
            role="tabpanel"
            aria-labelledby="hero-tab-compare"
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              const picked = [carA, carB].filter(Boolean);
              router.push(picked.length ? `/compare?cars=${picked.join(",")}` : "/compare");
            }}
          >
            <label className="sr-only" htmlFor="hero-car-a">First car</label>
            <select id="hero-car-a" value={carA} onChange={(e) => setCarA(e.target.value)} className={selectClass}>
              <option value="">Select first car</option>
              {cars.map((c) => (
                <option key={c.value} value={c.value} disabled={c.value === carB}>{c.label}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="hero-car-b">Second car</label>
            <select id="hero-car-b" value={carB} onChange={(e) => setCarB(e.target.value)} className={selectClass}>
              <option value="">Select second car</option>
              {cars.map((c) => (
                <option key={c.value} value={c.value} disabled={c.value === carA}>{c.label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              <GitCompareArrows className="size-4" aria-hidden="true" /> Compare
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
