import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex gap-3 rounded-xl border p-4 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", {
  variants: {
    variant: {
      info: "border-info/20 bg-info-soft text-ink [&>svg]:text-info",
      success: "border-success/20 bg-success-soft text-ink [&>svg]:text-success",
      warning: "border-warning/25 bg-warning-soft text-ink [&>svg]:text-warning",
      danger: "border-destructive/25 bg-red-50 text-ink [&>svg]:text-destructive",
      neutral: "bg-muted text-ink [&>svg]:text-muted-foreground",
    },
  },
  defaultVariants: { variant: "info" },
});

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert, neutral: Info };

function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants> & { title?: React.ReactNode }) {
  const Icon = ICONS[variant ?? "info"];
  return (
    <div role="note" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="leading-6 text-foreground/80">{children}</div>
      </div>
    </div>
  );
}

export { Alert };
