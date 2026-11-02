"use client";

import { Check, ChevronDown, Plus, Search, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { type ComparePick, compareHref } from "@/lib/compare-href";
import { cn } from "@/lib/utils";

export type WorkspaceCar = {
  slug: string;
  brand: string;
  model: string;
  priceRange: string;
  variantPrice: string;
  href: string;
  variant: string;
  variants: { value: string; label: string }[];
  visual: ReactNode;
};
export type WorkspaceRow = { label: string; values: string[]; best: number; differs: boolean; meter: number[] | null };
export type WorkspaceSection = { id: string; title: string; icon: ReactNode; rows: WorkspaceRow[] };
export type WorkspaceVerdict = { wins: number; badges: string[] };

const MAX = 4;

/** Type-to-search car picker, grouped by brand. */
export function CarSearch({ options, taken, onPick, autoFocus }: { options: { value: string; label: string; brand: string }[]; taken: Set<string>; onPick: (slug: string) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const matches = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return options.filter((o) => !taken.has(o.value) && terms.every((t) => o.label.toLowerCase().includes(t))).slice(0, 40);
  }, [q, options, taken]);
  const groups = useMemo(() => {
    const m = new Map<string, typeof matches>();
    for (const o of matches) m.set(o.brand, [...(m.get(o.brand) ?? []), o]);
    return [...m.entries()];
  }, [matches]);

  return (
    <div ref={box} className="relative">
      <label className="relative block">
        <span className="sr-only">Search a car to compare</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) onPick(matches[0].value);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search brand or model"
          className="h-11 w-full rounded-xl border border-input bg-white pr-3 pl-9 text-sm text-ink placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
        />
      </label>
      {open ? (
        <div role="listbox" className="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-72 overflow-y-auto rounded-xl border bg-white p-1.5 shadow-xl">
          {groups.length ? (
            groups.map(([brand, items]) => (
              <div key={brand}>
                <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{brand}</p>
                {items.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => onPick(o.value)}
                    className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-accent hover:text-primary"
                  >
                    {o.label.replace(`${brand} `, "")}
                  </button>
                ))}
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">No car matches “{q}”.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CompareWorkspace({
  picks,
  cars,
  options,
  sections,
  verdicts,
}: {
  picks: ComparePick[];
  cars: WorkspaceCar[];
  options: { value: string; label: string; brand: string }[];
  sections: WorkspaceSection[];
  verdicts: WorkspaceVerdict[];
}) {
  const router = useRouter();
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const taken = new Set(picks.map((p) => p.slug));
  const go = (next: ComparePick[]) => router.push(compareHref(next), { scroll: false });
  const n = cars.length;
  const grid = { gridTemplateColumns: `minmax(150px, 220px) repeat(${Math.max(n, 1)}, minmax(150px, 1fr))` };
  const slots = Array.from({ length: MAX }, (_, i) => cars[i] ?? null);
  const firstEmpty = cars.length;

  return (
    <div className="min-w-0 space-y-6">
      {/* Slot picker */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {slots.map((car, i) =>
          car ? (
            <div key={car.slug} className="relative flex flex-col rounded-2xl border bg-white p-3 shadow-[var(--shadow-card)]">
              <button
                type="button"
                onClick={() => go(picks.filter((_, j) => j !== i))}
                aria-label={`Remove ${car.brand} ${car.model}`}
                className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-full bg-white/90 text-muted-foreground shadow-sm hover:text-primary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
              <Link href={car.href} className="group block">
                <div className="overflow-hidden rounded-xl">{car.visual}</div>
                <p className="mt-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{car.brand}</p>
                <p className="font-bold text-ink group-hover:text-primary">{car.model}</p>
                <p className="text-xs text-muted-foreground">{car.priceRange}</p>
              </Link>
              <label className="mt-2.5 block">
                <span className="text-[11px] font-medium text-muted-foreground">Variant</span>
                <span className="relative mt-1 block">
                  <select
                    value={car.variant}
                    onChange={(e) => go(picks.map((p, j) => (j === i ? { ...p, variant: e.target.value } : p)))}
                    className="h-10 w-full appearance-none rounded-lg border border-input bg-surface pr-8 pl-3 text-sm font-medium text-ink hover:border-primary/40 focus:border-primary focus:outline-none"
                  >
                    {car.variants.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                </span>
              </label>
              <p className="mt-2 text-lg font-extrabold text-primary">{car.variantPrice}</p>
            </div>
          ) : (
            <div
              key={`empty-${i}`}
              className={cn(
                "flex min-h-56 flex-col justify-center gap-3 rounded-2xl border-2 border-dashed bg-white/60 p-4",
                i === firstEmpty ? "border-primary/40" : "border-border max-sm:hidden",
              )}
            >
              {i === firstEmpty ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-white">
                      <Plus className="size-4" aria-hidden="true" />
                    </span>
                    {n === 0 ? "Pick your first car" : "Add another car"}
                  </p>
                  <CarSearch options={options} taken={taken} onPick={(slug) => go([...picks, { slug }])} />
                </>
              ) : (
                <p className="text-center text-sm text-muted-foreground">Car {i + 1}</p>
              )}
            </div>
          ),
        )}
      </div>

      {n >= 2 ? (
        <section aria-label="Quick verdict" className="rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <Trophy className="size-5 text-amber-500" aria-hidden="true" /> Quick verdict
          </h2>
          <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {cars.map((car, i) => (
              <div key={car.slug} className="rounded-xl bg-surface p-3">
                <p className="truncate text-sm font-semibold text-ink">{car.model}</p>
                <p className="text-xs text-muted-foreground">
                  Best in <strong className="text-ink">{verdicts[i].wins}</strong> {verdicts[i].wins === 1 ? "spec" : "specs"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {verdicts[i].badges.length ? (
                    verdicts[i].badges.map((b) => (
                      <span key={b} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {b}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-muted-foreground">No standout wins</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {n ? (
        <section aria-label="Specifications" className="rounded-2xl border bg-white shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3 sm:p-4">
            <div role="radiogroup" aria-label="Rows to show" className="inline-flex rounded-xl bg-surface p-1 text-sm font-medium">
              {[
                { v: false, label: "All specs" },
                { v: true, label: "Only differences" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={onlyDiff === o.v}
                  onClick={() => setOnlyDiff(o.v)}
                  className={cn("rounded-lg px-3.5 py-1.5 transition-colors", onlyDiff === o.v ? "bg-white text-ink shadow-sm" : "text-muted-foreground hover:text-ink")}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="size-3" aria-hidden="true" />
              </span>
              marks the best value in a row
            </p>
          </div>

          <div className="max-lg:overflow-x-auto">
            <div className="min-w-fit">
              {/* Car names stay visible while scrolling the specs */}
              <div className="sticky top-16 z-20 grid border-b bg-white/95 backdrop-blur" style={grid}>
                <div className="sticky left-0 bg-white/95 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Spec</div>
                {cars.map((car) => (
                  <div key={car.slug} className="min-w-0 border-l px-4 py-2.5">
                    <p className="truncate text-sm font-bold text-ink">{car.model}</p>
                    <p className="truncate text-xs text-muted-foreground">{car.variants.find((v) => v.value === car.variant)?.label}</p>
                  </div>
                ))}
              </div>

              {sections.map((s) => {
                const rows = onlyDiff && n > 1 ? s.rows.filter((r) => r.differs) : s.rows;
                if (!rows.length) return null;
                const isOpen = !closed.has(s.id);
                const diffCount = s.rows.filter((r) => r.differs).length;
                return (
                  <div key={s.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setClosed((c) => {
                        const next = new Set(c);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      })}
                      className="sticky left-0 flex w-full items-center gap-2.5 bg-surface/60 px-4 py-3 text-left hover:bg-surface"
                    >
                      <span className="text-primary">{s.icon}</span>
                      <span className="font-semibold text-ink">{s.title}</span>
                      {n > 1 ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {diffCount ? `${diffCount} ${diffCount === 1 ? "difference" : "differences"}` : "Same on all"}
                        </span>
                      ) : null}
                      <ChevronDown className={cn("ml-auto size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                    </button>
                    {isOpen
                      ? rows.map((r) => (
                          <div key={r.label} className="grid border-t" style={grid}>
                            <div className="sticky left-0 z-10 bg-white px-4 py-3 text-sm text-muted-foreground">{r.label}</div>
                            {r.values.map((v, i) => (
                              <div key={cars[i].slug} className={cn("min-w-0 border-l px-4 py-3 text-sm", i === r.best ? "bg-emerald-50/60" : "")}>
                                <p className={cn("flex items-start gap-1.5 break-words", i === r.best ? "font-semibold text-emerald-700" : "text-ink")}>
                                  {i === r.best ? (
                                    <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                      <Check className="size-3" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                  <span>{v}</span>
                                </p>
                                {r.meter && r.meter[i] > 0 ? (
                                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                                    <div className={cn("h-full rounded-full", i === r.best ? "bg-emerald-500" : "bg-ink/25")} style={{ width: `${Math.round(r.meter[i] * 100)}%` }} />
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ))
                      : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
