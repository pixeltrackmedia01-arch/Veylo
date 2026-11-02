"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MAX_COMPARE, useCompareList } from "./compare-store";

/** One comparison column: a car and, optionally, the chosen variant. */
export type ComparePick = { slug: string; variant?: string };

/** `/compare?cars=creta,seltos&v=sx-turbo,` — variants line up with cars; blank = base variant. */
export function compareHref(picks: ComparePick[]) {
  if (!picks.length) return "/compare";
  const cars = picks.map((p) => p.slug).join(",");
  const v = picks.map((p) => p.variant ?? "").join(",");
  return `/compare?cars=${cars}${v.replace(/,/g, "") ? `&v=${v}` : ""}`;
}

/** Keeps the compare tray in step with the cars shown on this page. */
export function CompareSync({ slugs }: { slugs: string[] }) {
  const list = useCompareList();
  useEffect(() => {
    if (slugs.join(",") !== list.join(",")) {
      try {
        window.localStorage.setItem("gd-compare", JSON.stringify(slugs.slice(0, MAX_COMPARE)));
        window.dispatchEvent(new Event("gd-compare-change"));
      } catch {
        // Storage unavailable; the URL still drives the page.
      }
    }
    // Only sync when the page's cars change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join(",")]);
  return null;
}

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-ink hover:border-primary/50 focus:border-primary focus:outline-none";

/** "Add a car" column: choose a model, then add it. */
export function CompareAdd({ picks, options }: { picks: ComparePick[]; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const taken = new Set(picks.map((p) => p.slug));
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Plus className="size-4" aria-hidden="true" /> Add a car
      </p>
      <select aria-label="Choose a car model" value={value} onChange={(e) => setValue(e.target.value)} className={selectClass}>
        <option value="">Choose model…</option>
        {options
          .filter((o) => !taken.has(o.value))
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>
      <button
        type="button"
        disabled={!value}
        onClick={() => router.push(compareHref([...picks, { slug: value }]))}
        className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        Add to comparison
      </button>
    </div>
  );
}

/** Variant dropdown under each car. */
export function CompareVariant({
  picks,
  index,
  options,
}: {
  picks: ComparePick[];
  index: number;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const current = picks[index].variant ?? options[0]?.value ?? "";
  return (
    <select
      aria-label="Choose a variant"
      value={current}
      onChange={(e) => router.push(compareHref(picks.map((p, i) => (i === index ? { ...p, variant: e.target.value } : p))))}
      className={selectClass}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function CompareRemove({ picks, index }: { picks: ComparePick[]; index: number }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(compareHref(picks.filter((_, i) => i !== index)))}
      aria-label="Remove from comparison"
      className="absolute -top-2 -right-2 z-10 flex size-7 items-center justify-center rounded-full border bg-white text-ink shadow-sm hover:border-primary hover:text-primary"
    >
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );
}

/** "Show only the differences" switch; hides rows marked data-same in the wrapped table. */
export function CompareDiffToggle({ children }: { children: React.ReactNode }) {
  const [only, setOnly] = useState(false);
  return (
    <div data-only-diff={only || undefined} className="group/diff">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm">
        <input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
        Show only the differences
      </label>
      {children}
    </div>
  );
}
