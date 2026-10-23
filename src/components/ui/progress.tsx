import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max: number;
  label: string;
  className?: string;
  size?: "sm" | "md";
}

/** Group-progress bar. Accessible via role="progressbar". */
export function Progress({ value, max, label, className, size = "md" }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}`}
      className={cn("w-full overflow-hidden rounded-full bg-secondary", size === "sm" ? "h-1.5" : "h-2.5", className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
