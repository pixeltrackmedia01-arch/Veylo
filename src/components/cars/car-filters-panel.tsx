"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  activeFilterCount,
  BODY_OPTIONS,
  BUDGETS,
  type CarFilters,
  carsHref,
  type FilterKey,
  FUEL_OPTIONS,
  SORT_OPTIONS,
  toggleValue,
  TRANSMISSION_OPTIONS,
} from "@/lib/domain/car-filters";
import { cn } from "@/lib/utils";

type Option = { key: string; label: string };

function Group({
  title,
  name,
  options,
  filters,
  onToggle,
}: {
  title: string;
  name: FilterKey;
  options: readonly Option[];
  filters: CarFilters;
  onToggle: (href: string) => void;
}) {
  return (
    <fieldset className="border-b py-4 last:border-b-0">
      <legend className="mb-2.5 text-xs font-bold tracking-wider text-ink uppercase">{title}</legend>
      <ul className="space-y-1.5">
        {options.map((o) => {
          const checked = filters[name].includes(o.key);
          const id = `f-${name}-${o.key}`;
          return (
            <li key={o.key}>
              <label htmlFor={id} className="group flex cursor-pointer items-center gap-2.5 rounded-md py-0.5 text-sm text-foreground/80 hover:text-ink">
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(toggleValue(filters, name, o.key))}
                  className="size-4 cursor-pointer rounded border-input accent-[var(--brand-primary)]"
                />
                <span className={cn(checked && "font-semibold text-ink")}>{o.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function Panel({ filters, brands, onNavigate }: { filters: CarFilters; brands: Option[]; onNavigate: (href: string) => void }) {
  const count = activeFilterCount(filters);
  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-base font-bold text-ink">Filters</h2>
        {count ? (
          <Link href={carsHref({ ...filters, q: undefined, brand: [], budget: [], body: [], fuel: [], trans: [] })} className="text-xs font-semibold text-primary hover:underline">
            Clear All
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Clear All</span>
        )}
      </div>
      <Group title="Brand" name="brand" options={brands} filters={filters} onToggle={onNavigate} />
      <Group title="Budget" name="budget" options={BUDGETS} filters={filters} onToggle={onNavigate} />
      <Group title="Body type" name="body" options={BODY_OPTIONS} filters={filters} onToggle={onNavigate} />
      <Group title="Fuel type" name="fuel" options={FUEL_OPTIONS} filters={filters} onToggle={onNavigate} />
      <Group title="Transmission" name="trans" options={TRANSMISSION_OPTIONS} filters={filters} onToggle={onNavigate} />
    </div>
  );
}

function useNavigate() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return { pending, navigate: (href: string) => start(() => router.push(href, { scroll: false })) };
}

/** Desktop sidebar. */
export function CarFiltersSidebar({ filters, brands }: { filters: CarFilters; brands: Option[] }) {
  const { pending, navigate } = useNavigate();
  return (
    <aside
      aria-label="Filters"
      className={cn("sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] transition-opacity lg:block", pending && "opacity-70")}
    >
      <Panel filters={filters} brands={brands} onNavigate={navigate} />
    </aside>
  );
}

/** Mobile slide-out drawer. */
export function CarFiltersDrawer({ filters, brands, total }: { filters: CarFilters; brands: Option[]; total: number }) {
  const [open, setOpen] = useState(false);
  const { navigate } = useNavigate();
  const count = activeFilterCount(filters);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-primary hover:text-primary lg:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" /> Filters{count ? ` (${count})` : ""}
        </button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetTitle className="sr-only">Filters</SheetTitle>
        <Panel filters={filters} brands={brands} onNavigate={navigate} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="sticky bottom-0 mt-4 h-11 w-full rounded-xl bg-primary font-bold text-white shadow-lg"
        >
          Show {total} {total === 1 ? "car" : "cars"}
        </button>
      </SheetContent>
    </Sheet>
  );
}

export function CarSortSelect({ filters }: { filters: CarFilters }) {
  const { navigate } = useNavigate();
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Sort by:
      <select
        value={filters.sort}
        onChange={(e) => navigate(carsHref(filters, { sort: e.target.value as CarFilters["sort"] }))}
        className="h-10 rounded-xl border border-input bg-white px-3 text-sm font-medium text-ink hover:border-primary/50 focus:border-primary focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
