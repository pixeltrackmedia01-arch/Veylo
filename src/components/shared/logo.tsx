import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${siteConfig.name} home`}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/30 transition-transform group-hover:-rotate-6">
        <svg viewBox="0 0 32 32" className="size-5" aria-hidden="true">
          <circle cx="10" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="22" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M5 16 L11 9 H21 L27 16" fill="none" stroke="currentColor" opacity="0.75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-primary">{siteConfig.name}</span>
    </Link>
  );
}
