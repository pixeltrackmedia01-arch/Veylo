"use client";

import { GitCompareArrows } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MAX_COMPARE, toggleCompare, useCompareList } from "./compare-store";

export function CompareToggle({ slug, name, className, withLabel }: { slug: string; name: string; className?: string; withLabel?: boolean }) {
  const list = useCompareList();
  const active = list.includes(slug);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${name} from compare` : `Add ${name} to compare`}
      title={active ? "Remove from compare" : "Add to compare"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!toggleCompare(slug)) toast.error(`You can compare up to ${MAX_COMPARE} cars. Remove one first.`);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border bg-white/95 text-ink shadow-sm transition-all hover:scale-110 hover:border-primary hover:text-primary",
        withLabel ? "h-10 px-4 text-sm font-semibold hover:scale-100" : "size-8",
        active && "border-primary bg-primary text-white hover:text-white",
        className,
      )}
    >
      <GitCompareArrows className="size-4" aria-hidden="true" />
      {withLabel ? (active ? "Added to compare" : "Compare") : null}
    </button>
  );
}
