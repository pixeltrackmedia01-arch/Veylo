import { Car, Search, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VehicleCard } from "@/components/catalogue/vehicle-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { facetOptions, searchCatalogue, type CatalogueFilters } from "@/lib/data/catalogue";
import { isSupabaseConfigured } from "@/lib/env";
import { titleCase } from "@/lib/utils";
import { PriceBandClient } from "./price-band";

export const metadata: Metadata = {
  title: "Vehicle group deals",
  description: "Browse cars and two-wheelers with open buyer groups in Surat. Joining a group is free.",
  alternates: { canonical: "/vehicles" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined) {
  return typeof v === "string" && v.length ? v : undefined;
}
function num(v: string | string[] | undefined) {
  const s = str(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const PRICE_BANDS = [
  { label: "Any price", min: "", max: "" },
  { label: "Under ₹1 lakh", min: "", max: "100000" },
  { label: "₹1–5 lakh", min: "100000", max: "500000" },
  { label: "₹5–10 lakh", min: "500000", max: "1000000" },
  { label: "₹10–20 lakh", min: "1000000", max: "2000000" },
  { label: "Above ₹20 lakh", min: "2000000", max: "" },
];

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container-page py-12">
        <SetupNotice />
      </div>
    );
  }
  const sp = await searchParams;
  const category = str(sp.category);
  // Cars are browsed on /cars; keep old links working.
  if (category === "car") redirect(str(sp.q) ? `/cars?q=${encodeURIComponent(str(sp.q)!)}` : "/cars");
  const filters: CatalogueFilters = {
    q: str(sp.q),
    category: category === "car" || category === "two_wheeler" ? category : undefined,
    manufacturer: str(sp.manufacturer),
    fuel: str(sp.fuel),
    transmission: str(sp.transmission),
    body: str(sp.body),
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    sort: (["popularity", "newest", "progress"] as const).find((s) => s === str(sp.sort)) ?? "popularity",
    page: num(sp.page) ?? 1,
  };
  const { items, total, page, pageCount, all } = await searchCatalogue(filters);
  const facets = facetOptions(filters.category ? all.filter((v) => v.category === filters.category) : all);
  const priceValue = `${str(sp.min) ?? ""}-${str(sp.max) ?? ""}`;

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page") params.set(k, v);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/vehicles?${qs}` : "/vehicles";
  };

  const heading =
    filters.category === "car" ? "Cars" : filters.category === "two_wheeler" ? "Two-wheelers" : "All vehicles";

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-primary">Group deals in Surat</p>
        <h1 className="text-3xl font-bold sm:text-4xl">{heading}</h1>
        <p className="max-w-2xl text-muted-foreground">
          Every group is for one exact variant. Prices shown are indicative references with their source on the vehicle page —
          final prices are quoted by authorised dealerships.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="navigation" aria-label="Vehicle category">
        {[
          { label: "All", value: undefined },
          { label: "Cars", value: "car" },
          { label: "Two-wheelers", value: "two_wheeler" },
        ].map((c) => (
          <Link
            key={c.label}
            href={c.value ? `/vehicles?category=${c.value}` : "/vehicles"}
            aria-current={filters.category === c.value ? "page" : undefined}
            className="rounded-full border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-muted aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {c.label}
          </Link>
        ))}
      </div>

      <form method="get" action="/vehicles" className="mt-6 rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
        {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
          <div className="grid gap-1.5">
            <Label htmlFor="q">Search manufacturer or model</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="q" name="q" defaultValue={filters.q} placeholder="e.g. Swift, Activa, Hyundai" className="pl-10" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <NativeSelect id="manufacturer" name="manufacturer" defaultValue={filters.manufacturer ?? ""}>
              <option value="">All manufacturers</option>
              {facets.manufacturers.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sort">Sort by</Label>
            <NativeSelect id="sort" name="sort" defaultValue={filters.sort}>
              <option value="popularity">Most popular</option>
              <option value="newest">Newest groups</option>
              <option value="progress">Group progress</option>
            </NativeSelect>
          </div>
        </div>
        <details className="group mt-4" open={Boolean(filters.fuel || filters.transmission || filters.body || sp.min || sp.max)}>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink">
            <SlidersHorizontal className="size-4" aria-hidden="true" /> More filters
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fuel">Fuel type</Label>
              <NativeSelect id="fuel" name="fuel" defaultValue={filters.fuel ?? ""}>
                <option value="">Any</option>
                {facets.fuels.map((f) => (
                  <option key={f} value={f}>
                    {titleCase(f)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="transmission">Transmission</Label>
              <NativeSelect id="transmission" name="transmission" defaultValue={filters.transmission ?? ""}>
                <option value="">Any</option>
                {facets.transmissions.map((t) => (
                  <option key={t} value={t}>
                    {t.length <= 3 ? t.toUpperCase() : titleCase(t)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="body">Body type</Label>
              <NativeSelect id="body" name="body" defaultValue={filters.body ?? ""}>
                <option value="">Any</option>
                {facets.bodies.map((b) => (
                  <option key={b} value={b}>
                    {titleCase(b)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <PriceBandSelect value={priceValue} />
          </div>
        </details>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">Apply filters</Button>
          <Button asChild variant="ghost">
            <Link href={filters.category ? `/vehicles?category=${filters.category}` : "/vehicles"}>Reset</Link>
          </Button>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {total} vehicle{total === 1 ? "" : "s"} found
      </p>

      {items.length ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-4"
          icon={Car}
          title="No vehicles match these filters"
          description="Try removing a filter or searching for a different model. New vehicles and groups are added regularly."
          action={
            <Button asChild variant="outline">
              <Link href="/vehicles">Clear filters</Link>
            </Button>
          }
        />
      )}

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>Previous</Link>
            </Button>
          ) : null}
          <span className="px-3 text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>Next</Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

/** Two hidden inputs driven by one select keeps the filter form JavaScript-free. */
function PriceBandSelect({ value }: { value: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="price">Indicative ex-showroom</Label>
      <PriceBandClient value={value} bands={PRICE_BANDS} />
    </div>
  );
}

