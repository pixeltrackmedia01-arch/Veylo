"use client";

import { GitCompareArrows, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearCompare, MAX_COMPARE, toggleCompare, useCompareList } from "./compare-store";

/** Floating bar listing cars picked for comparison. */
export function CompareTray({ names }: { names: Record<string, string> }) {
  const list = useCompareList();
  const pathname = usePathname();
  if (!list.length || pathname.startsWith("/compare")) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 px-4">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl bg-ink p-3 pl-4 text-white shadow-2xl shadow-black/30 animate-in slide-in-from-bottom-4">
        <GitCompareArrows className="size-5 text-primary" aria-hidden="true" />
        <ul className="flex flex-1 flex-wrap gap-2">
          {list.map((slug) => (
            <li key={slug} className="inline-flex items-center gap-1 rounded-full bg-white/10 py-1 pr-1 pl-3 text-sm">
              {names[slug] ?? slug}
              <button
                type="button"
                onClick={() => toggleCompare(slug)}
                className="rounded-full p-1 hover:bg-white/20"
                aria-label={`Remove ${names[slug] ?? slug}`}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
          <li className="self-center text-xs text-white/60">
            {list.length}/{MAX_COMPARE}
          </li>
        </ul>
        <button type="button" onClick={clearCompare} className="text-sm text-white/70 hover:text-white">
          Clear
        </button>
        <Link
          href={`/compare?cars=${list.join(",")}`}
          className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold transition-colors hover:bg-primary-hover"
        >
          Compare {list.length > 1 ? "now" : "— add one more"}
        </Link>
      </div>
    </div>
  );
}
