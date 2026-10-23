"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Header search for cars by brand or model; press "/" anywhere to focus it. */
export function HeaderSearch() {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (e.key === "/" && !typing) {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/cars?q=${encodeURIComponent(q.trim())}` : "/cars");
        ref.current?.blur();
      }}
      className="group relative hidden md:block"
    >
      <label htmlFor="header-search" className="sr-only">
        Search cars by brand or model
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        ref={ref}
        id="header-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search"
        className="h-10 w-36 rounded-xl border border-input bg-white pr-9 pl-9 text-sm text-ink transition-all placeholder:text-muted-foreground hover:border-primary/40 focus:w-56 focus:border-primary focus:outline-none lg:w-44"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground group-focus-within:hidden">
        /
      </kbd>
    </form>
  );
}
