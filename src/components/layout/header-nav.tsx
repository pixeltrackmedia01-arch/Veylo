"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/groups", label: "Group Deals" },
  { href: "/cars", label: "New Cars" },
  { href: "/emi-calculator", label: "EMI Calculator" },
  { href: "/compare", label: "Compare" },
  { href: "/faq", label: "FAQ" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative px-3 py-2 text-[15px] font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:origin-left after:rounded-full after:bg-primary after:transition-transform",
              active ? "text-primary after:scale-x-100" : "text-ink/80 after:scale-x-0 hover:text-primary hover:after:scale-x-100",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
