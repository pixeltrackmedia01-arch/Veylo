import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-transparent bg-secondary text-secondary-foreground",
        success: "border-transparent bg-success-soft text-success",
        info: "border-transparent bg-info-soft text-info",
        warning: "border-transparent bg-warning-soft text-warning",
        danger: "border-transparent bg-red-50 text-destructive",
        outline: "border-border bg-white text-ink",
        demo: "border-dashed border-amber-400 bg-amber-50 text-amber-800",
        brand: "border-transparent bg-accent text-accent-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
