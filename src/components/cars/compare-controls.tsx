"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MAX_COMPARE, useCompareList } from "./compare-store";

const href = (slugs: string[]) => (slugs.length ? `/compare?cars=${slugs.join(",")}` : "/compare");

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

export function ComparePicker({ slugs, options }: { slugs: string[]; options: { value: string; label: string }[] }) {
  const router = useRouter();
  return (
    <select
      aria-label="Add a car to compare"
      defaultValue=""
      onChange={(e) => e.target.value && router.push(href([...slugs, e.target.value]))}
      className="h-10 w-full max-w-56 rounded-xl border border-input bg-white px-3 text-sm text-ink hover:border-primary/50 focus:border-primary focus:outline-none"
    >
      <option value="">Add a car</option>
      {options
        .filter((o) => !slugs.includes(o.value))
        .map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
    </select>
  );
}

export function CompareRemove({ slugs, slug }: { slugs: string[]; slug: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href(slugs.filter((s) => s !== slug)))}
      aria-label="Remove from comparison"
      className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full border bg-white text-ink shadow-sm hover:border-primary hover:text-primary"
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}
