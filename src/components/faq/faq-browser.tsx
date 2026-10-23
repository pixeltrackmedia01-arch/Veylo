"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { categoryMeta, FAQ_CATEGORIES } from "@/components/faq/faq-categories";
import { type FaqItem, FaqList } from "@/components/faq/faq-list";
import { cn } from "@/lib/utils";

export type FaqWithCategory = FaqItem & { category: string };

/** FAQ page: live search, category tabs with counts, and grouped accordions. */
export function FaqBrowser({ faqs }: { faqs: FaqWithCategory[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const query = q.trim().toLowerCase();

  const known = new Set<string>(FAQ_CATEGORIES.map((c) => c.key));
  const categories = useMemo(() => {
    const keys = [...FAQ_CATEGORIES.map((c) => c.key as string), ...new Set(faqs.map((f) => f.category).filter((k) => !known.has(k)))];
    return keys.map((key) => ({ ...categoryMeta(key), key, count: faqs.filter((f) => f.category === key).length })).filter((c) => c.count);
    // `known` is derived from a constant list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faqs]);

  const matches = faqs.filter(
    (f) => (cat === "all" || f.category === cat) && (!query || `${f.question} ${f.answer}`.toLowerCase().includes(query)),
  );

  return (
    <div>
      <div className="relative mx-auto -mt-7 max-w-2xl">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="faq-search" className="sr-only">
          Search questions
        </label>
        <input
          id="faq-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search questions, e.g. on-road price, leave a group, EMI"
          className="h-14 w-full rounded-2xl border bg-white pr-12 pl-12 text-base text-ink shadow-xl shadow-black/5 transition-colors hover:border-primary/40 focus:border-primary focus:outline-none"
        />
        {q ? (
          <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-ink">
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div role="tablist" aria-label="FAQ categories" className="mt-8 flex flex-wrap justify-center gap-2">
        {[{ key: "all", label: "All questions", icon: null, count: faqs.length }, ...categories].map((c) => {
          const active = cat === c.key;
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setCat(c.key)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all",
                active ? "border-primary bg-primary text-white shadow-sm shadow-primary/30" : "bg-white text-ink/80 hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary",
              )}
            >
              {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
              {c.label}
              <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-white/20" : "bg-secondary text-muted-foreground")}>{c.count}</span>
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-6">
        {matches.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-white p-10 text-center text-muted-foreground">
            No questions match &ldquo;{q}&rdquo;. Try another word, or ask us below.
          </p>
        ) : (
          categories
            .filter((c) => matches.some((m) => m.category === c.key))
            .map((c) => (
              <section key={c.key} aria-labelledby={`faq-cat-${c.key}`} className="rounded-2xl border bg-white px-5 pt-4 pb-1 shadow-[var(--shadow-card)] sm:px-6">
                <h2 id={`faq-cat-${c.key}`} className="flex items-center gap-2.5 text-lg font-bold">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <c.icon className="size-5" aria-hidden="true" />
                  </span>
                  {c.label}
                </h2>
                <FaqList items={matches.filter((m) => m.category === c.key)} />
              </section>
            ))
        )}
      </div>
    </div>
  );
}
