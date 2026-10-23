import { MapPin, Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CarCard } from "@/components/cars/car-card";
import { CarFiltersDrawer, CarFiltersSidebar, CarSortSelect } from "@/components/cars/car-filters-panel";
import { CompareTray } from "@/components/cars/compare-tray";
import { BrandMark } from "@/components/home/brand-tile";
import { SetupNotice } from "@/components/shared/setup-notice";
import { brandForManufacturer } from "@/config/brands";
import { siteConfig } from "@/config/site";
import { getViewer } from "@/lib/auth/session";
import { getSavedVehicleIds, searchCars } from "@/lib/data/cars";
import { activeFilterCount, carsHref, type CarFilters, parseFilters, toggleValue } from "@/lib/domain/car-filters";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "New Cars — prices, specifications and group deals",
  description: `Browse new cars with indicative ${siteConfig.launchCity.name} prices, specifications, mileage and EMI estimates, and join a group deal.`,
  alternates: { canonical: "/cars" },
};

const QUICK_CHIPS: { label: string; key: "body" | "budget" | "trans" | "fuel"; value: string }[] = [
  { label: "SUV", key: "body", value: "suv" },
  { label: "Hatchback", key: "body", value: "hatchback" },
  { label: "Sedan", key: "body", value: "sedan" },
  { label: "7-seater MUV", key: "body", value: "muv" },
  { label: "Under ₹5 Lakh", key: "budget", value: "u5" },
  { label: "₹5 - 10 Lakh", key: "budget", value: "5-10" },
  { label: "₹10 - 15 Lakh", key: "budget", value: "10-15" },
  { label: "Automatic", key: "trans", value: "automatic" },
  { label: "CNG", key: "fuel", value: "cng" },
  { label: "Diesel", key: "fuel", value: "diesel" },
  { label: "Electric", key: "fuel", value: "electric" },
  { label: "Hybrid", key: "fuel", value: "hybrid" },
];

const chipClass = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-all",
    active
      ? "border-primary bg-primary text-white shadow-sm shadow-primary/30"
      : "bg-white text-ink/80 hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary hover:shadow-sm",
  );

export default async function CarsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page py-12">
        <SetupNotice />
      </div>
    );
  }
  const filters: CarFilters = parseFilters(await searchParams);
  const viewer = await getViewer();
  const [{ all, items }, saved] = await Promise.all([searchCars(filters), getSavedVehicleIds(viewer?.id)]);

  const brandOptions = [...new Map(all.map((c) => [c.manufacturer.slug, c.manufacturer.name])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([key, label]) => ({ key, label }));
  const names = Object.fromEntries(all.map((c) => [c.slug, `${c.manufacturer.name} ${c.model_name}`]));

  return (
    <div className="bg-surface pb-24">
      <div className="container-page space-y-5 pt-6">
        {/* Title card */}
        <section className="flex flex-col gap-5 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
              <Link href="/" className="hover:text-primary">Home</Link> / <span className="text-ink">New Cars</span>
            </nav>
            <h1 className="mt-1.5 text-2xl font-extrabold sm:text-3xl">New Cars in {siteConfig.launchCity.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing {items.length} of {all.length} new cars · indicative {siteConfig.launchCity.name} prices
            </p>
          </div>
          <form action="/cars" className="flex flex-col gap-2 sm:flex-row" role="search">
            {(["brand", "budget", "body", "fuel", "trans"] as const).map((k) =>
              filters[k].length ? <input key={k} type="hidden" name={k} value={filters[k].join(",")} /> : null,
            )}
            <label className="relative">
              <span className="sr-only">Search brand or model</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Search brand or model..."
                className="h-11 w-full rounded-xl border border-input bg-white pr-3 pl-9 text-sm hover:border-primary/40 focus:border-primary focus:outline-none sm:w-64"
              />
            </label>
            <label className="relative">
              <span className="sr-only">City</span>
              <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <select
                disabled
                className="h-11 w-full appearance-none rounded-xl border border-input bg-muted/40 pr-3 pl-9 text-sm text-ink sm:w-44"
                title={`Prices are currently shown for ${siteConfig.launchCity.name}`}
              >
                <option>{siteConfig.launchCity.name}</option>
              </select>
            </label>
          </form>
        </section>

        {/* Brand chips */}
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {brandOptions.map((b) => {
            const active = filters.brand.includes(b.key);
            const brand = brandForManufacturer(b.key);
            return (
              <Link key={b.key} href={toggleValue(filters, "brand", b.key)} scroll={false} className={cn(chipClass(active), "h-11 pr-4 pl-2")}>
                {brand ? (
                  <span className={cn("flex size-8 items-center justify-center rounded-full", active ? "bg-white" : "bg-secondary")}>
                    <BrandMark brand={brand} className="h-5 w-6 text-[8px] sm:h-5 sm:w-6" />
                  </span>
                ) : null}
                {b.label}
              </Link>
            );
          })}
        </div>

        {/* Quick chips */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {QUICK_CHIPS.map((c) => (
            <Link key={c.label} href={toggleValue(filters, c.key, c.value)} scroll={false} className={chipClass(filters[c.key].includes(c.value))}>
              {c.label}
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <CarFiltersSidebar filters={filters} brands={brandOptions} />
          <section aria-label="Results" className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-[var(--shadow-card)]">
              <CarFiltersDrawer filters={filters} brands={brandOptions} total={items.length} />
              <p className="hidden text-sm text-muted-foreground lg:block">
                {items.length} {items.length === 1 ? "car" : "cars"}
                {activeFilterCount(filters) ? " match your filters" : ""}
              </p>
              <CarSortSelect filters={filters} />
            </div>
            {items.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((car) => (
                  <CarCard key={car.id} car={car} saved={saved.has(car.id)} signedIn={Boolean(viewer)} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
                <SearchX className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 font-semibold text-ink">No cars match these filters</p>
                <p className="mt-1 text-sm text-muted-foreground">Try removing a filter or searching for a different model.</p>
                <Link href={carsHref({ ...filters, q: undefined, brand: [], budget: [], body: [], fuel: [], trans: [] })} className="mt-4 inline-block font-semibold text-primary hover:underline">
                  Clear all filters
                </Link>
              </div>
            )}
            <p className="mt-6 text-xs leading-5 text-muted-foreground">
              Prices are indicative ex-showroom figures for {siteConfig.launchCity.name}; EMI estimates assume {siteConfig.emi.downPaymentPct}% down
              payment, {siteConfig.emi.annualRatePct}% interest and {siteConfig.emi.tenureMonths / 12} years on the on-road price. Confirm the final
              price, offers and loan terms with the dealership and your lender.
            </p>
          </section>
        </div>
      </div>
      <CompareTray names={names} />
    </div>
  );
}
