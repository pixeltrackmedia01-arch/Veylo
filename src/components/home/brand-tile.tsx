import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/config/brands";
import type { VehicleCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export function brandHref(brand: Brand, category: VehicleCategory) {
  if (category === "car") return brand.slug ? `/cars?brand=${brand.slug}` : `/cars?q=${encodeURIComponent(brand.query)}`;
  return `/vehicles?${new URLSearchParams({ category, q: brand.query })}`;
}

export function BrandMark({ brand, className }: { brand: Brand; className?: string }) {
  if (brand.logo) {
    return (
      <Image
        src={brand.logo}
        alt=""
        width={96}
        height={48}
        unoptimized
        className={cn("h-10 w-20 object-contain sm:h-12 sm:w-24", className)}
      />
    );
  }
  // No licensed logo file yet: show the brand name as a wordmark in its colour.
  return (
    <span
      className={cn("font-display text-[13px] leading-tight font-extrabold tracking-tight uppercase sm:text-base", className)}
      style={{ color: brand.color }}
    >
      {brand.wordmark ?? brand.name.split(" ")[0]}
    </span>
  );
}

export function BrandTile({ brand, category }: { brand: Brand; category: VehicleCategory }) {
  return (
    <Link
      href={brandHref(brand, category)}
      className="group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border bg-white px-2 py-4 sm:gap-3 sm:px-3 sm:py-5 text-center shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-[var(--shadow-lift)] focus-visible:-translate-y-1"
      style={{ ["--brand" as string]: brand.color }}
    >
      <span
        className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-[var(--brand)] transition-transform duration-300 group-hover:scale-x-100"
        aria-hidden="true"
      />
      <span className="flex h-12 items-center justify-center grayscale-[35%] transition-all duration-200 group-hover:scale-110 group-hover:grayscale-0">
        <BrandMark brand={brand} />
      </span>
      <span className="text-xs font-semibold text-ink/80 sm:text-sm transition-colors group-hover:text-ink">{brand.name}</span>
    </Link>
  );
}
