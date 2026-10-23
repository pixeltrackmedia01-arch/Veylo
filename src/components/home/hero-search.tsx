"use client";

import { Bike, Car, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAR_BRANDS, TWO_WHEELER_BRANDS } from "@/config/brands";
import type { VehicleCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

// Match the price bands offered on the vehicles page so the filter shows as selected there.
const BUDGETS: Record<VehicleCategory, { label: string; min?: number; max?: number }[]> = {
  car: [
    { label: "Under ₹5 lakh", min: 100000, max: 500000 },
    { label: "₹5–10 lakh", min: 500000, max: 1000000 },
    { label: "₹10–20 lakh", min: 1000000, max: 2000000 },
    { label: "Above ₹20 lakh", min: 2000000 },
  ],
  two_wheeler: [
    { label: "Under ₹1 lakh", max: 100000 },
    { label: "₹1–5 lakh", min: 100000, max: 500000 },
  ],
};

const fieldClass =
  "h-12 w-full rounded-xl border border-input bg-white px-3 text-[15px] text-ink transition-colors hover:border-primary/50 focus:border-primary focus:outline-none";

export function HeroSearch() {
  const router = useRouter();
  const [category, setCategory] = useState<VehicleCategory>("car");
  const [brand, setBrand] = useState("");
  const [budget, setBudget] = useState("");
  const [query, setQuery] = useState("");
  const brands = category === "car" ? CAR_BRANDS : TWO_WHEELER_BRANDS;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ category });
    const q = [brand, query.trim()].filter(Boolean).join(" ");
    if (q) params.set("q", q);
    const range = budget ? BUDGETS[category][Number(budget)] : undefined;
    if (range?.min) params.set("min", String(range.min));
    if (range?.max) params.set("max", String(range.max));
    router.push(`/vehicles?${params}`);
  }

  function switchCategory(next: VehicleCategory) {
    setCategory(next);
    setBrand("");
    setBudget("");
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-4 shadow-2xl shadow-black/30 sm:p-5" role="search">
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1.5" role="radiogroup" aria-label="Vehicle type">
        {(
          [
            { value: "car", label: "Cars", icon: Car },
            { value: "two_wheeler", label: "Two-wheelers", icon: Bike },
          ] as const
        ).map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={category === c.value}
            onClick={() => switchCategory(c.value)}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
              category === c.value ? "bg-white text-ink shadow-sm" : "text-muted-foreground hover:text-ink",
            )}
          >
            <c.icon className="size-4" aria-hidden="true" /> {c.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sr-only" htmlFor="hero-brand">
          Brand
        </label>
        <select id="hero-brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={fieldClass}>
          <option value="">Any brand</option>
          {brands.map((b) => (
            <option key={b.name} value={b.query}>
              {b.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="hero-budget">
          Budget
        </label>
        <select id="hero-budget" value={budget} onChange={(e) => setBudget(e.target.value)} className={fieldClass}>
          <option value="">Any budget</option>
          {BUDGETS[category].map((b, i) => (
            <option key={b.label} value={i}>
              {b.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="hero-q">
          Model
        </label>
        <input
          id="hero-q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={category === "car" ? "Model, e.g. Swift, Creta, Nexon" : "Model, e.g. Activa, Jupiter, Pulsar"}
          className={cn(fieldClass, "sm:col-span-2")}
        />
      </div>
      <button
        type="submit"
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/40 active:translate-y-0"
      >
        <Search className="size-5" aria-hidden="true" /> Find group deals
      </button>
    </form>
  );
}
