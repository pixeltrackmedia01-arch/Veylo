/** Filter options, matching and URL helpers for the New Cars listing (safe for client and server). */

import type { CarSummary } from "@/lib/data/cars";
import { bodyGroup, fuelGroup, transmissionGroup } from "@/lib/domain/car-labels";

export const BUDGETS = [
  { key: "u5", label: "Under ₹5 Lakh", min: 0, max: 500000 },
  { key: "5-10", label: "₹5 - 10 Lakh", min: 500000, max: 1000000 },
  { key: "10-15", label: "₹10 - 15 Lakh", min: 1000000, max: 1500000 },
  { key: "15-20", label: "₹15 - 20 Lakh", min: 1500000, max: 2000000 },
  { key: "20-30", label: "₹20 - 30 Lakh", min: 2000000, max: 3000000 },
  { key: "30p", label: "Above ₹30 Lakh", min: 3000000, max: Infinity },
] as const;

export const BODY_OPTIONS = [
  { key: "sedan", label: "Sedan" },
  { key: "suv", label: "SUV" },
  { key: "hatchback", label: "Hatchback" },
  { key: "muv", label: "MUV" },
  { key: "coupe", label: "Coupe" },
  { key: "convertible", label: "Convertible" },
  { key: "pickup", label: "Pickup" },
  { key: "minivan", label: "Minivan" },
] as const;

export const FUEL_OPTIONS = [
  { key: "petrol", label: "Petrol" },
  { key: "diesel", label: "Diesel" },
  { key: "electric", label: "Electric" },
  { key: "hybrid", label: "Hybrid" },
  { key: "cng", label: "CNG" },
] as const;

export const TRANSMISSION_OPTIONS = [
  { key: "manual", label: "Manual" },
  { key: "automatic", label: "Automatic" },
] as const;

export const SORT_OPTIONS = [
  { key: "popularity", label: "Popularity" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "mileage", label: "Mileage" },
  { key: "newest", label: "Newest" },
] as const;

export type CarSort = (typeof SORT_OPTIONS)[number]["key"];

export interface CarFilters {
  q?: string;
  brand: string[];
  budget: string[];
  body: string[];
  fuel: string[];
  trans: string[];
  sort: CarSort;
}

export function parseList(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

export const FILTER_KEYS = ["brand", "budget", "body", "fuel", "trans"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export function parseFilters(sp: Record<string, string | string[] | undefined>): CarFilters {
  const sort = SORT_OPTIONS.find((o) => o.key === (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort))?.key ?? "popularity";
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() || undefined;
  return {
    q,
    brand: parseList(sp.brand),
    budget: parseList(sp.budget),
    body: parseList(sp.body),
    fuel: parseList(sp.fuel),
    trans: parseList(sp.trans),
    sort,
  };
}

/** Serialises filters to a /cars URL, with `change` applied. */
export function carsHref(f: CarFilters, change: Partial<CarFilters> = {}) {
  const next = { ...f, ...change };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  for (const key of FILTER_KEYS) if (next[key].length) params.set(key, next[key].join(","));
  if (next.sort && next.sort !== "popularity") params.set("sort", next.sort);
  const qs = params.toString();
  return qs ? `/cars?${qs}` : "/cars";
}

export function toggleValue(f: CarFilters, key: FilterKey, value: string) {
  const list = f[key];
  return carsHref(f, { [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
}

export function activeFilterCount(f: CarFilters) {
  return FILTER_KEYS.reduce((n, k) => n + f[k].length, 0) + (f.q ? 1 : 0);
}

export function matchesCar(car: CarSummary, f: CarFilters) {
  if (f.brand.length && !f.brand.includes(car.manufacturer.slug)) return false;
  if (f.body.length && !f.body.includes(bodyGroup(car.body_type) ?? "")) return false;
  if (f.fuel.length && !car.variants.some((x) => f.fuel.includes(fuelGroup(x.fuel_type) ?? ""))) return false;
  if (f.trans.length && !car.variants.some((x) => f.trans.includes(transmissionGroup(x.transmission) ?? ""))) return false;
  if (f.budget.length) {
    if (car.fromPrice === null) return false;
    const ranges = BUDGETS.filter((b) => f.budget.includes(b.key));
    if (!ranges.some((r) => car.fromPrice! >= r.min && car.fromPrice! < r.max)) return false;
  }
  const q = f.q?.trim().toLowerCase();
  if (q) {
    const hay = `${car.manufacturer.name} ${car.model_name} ${car.variants.map((x) => x.name).join(" ")}`.toLowerCase();
    if (!q.split(/\s+/).every((t) => hay.includes(t))) return false;
  }
  return true;
}

export function sortCars(cars: CarSummary[], sort: CarSort) {
  const byPrice = (c: CarSummary) => c.fromPrice ?? Number.MAX_SAFE_INTEGER;
  return [...cars].sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return byPrice(a) - byPrice(b);
      case "price_desc":
        return (b.fromPrice ?? -1) - (a.fromPrice ?? -1);
      case "mileage":
        return (b.bestMileage ?? -1) - (a.bestMileage ?? -1);
      case "newest":
        return (b.published_at ?? "").localeCompare(a.published_at ?? "");
      default:
        return b.popularity - a.popularity || b.totalVerified - a.totalVerified;
    }
  });
}
