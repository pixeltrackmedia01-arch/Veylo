"use client";

import {
  BarChart3,
  Bell,
  Building2,
  Car,
  ClipboardList,
  FileText,
  Handshake,
  IndianRupee,
  Inbox,
  LayoutDashboard,
  ScrollText,
  Settings,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  groups: UsersRound,
  profile: UserRound,
  bell: Bell,
  car: Car,
  users: Users,
  dealers: Building2,
  quotes: FileText,
  sales: Handshake,
  money: IndianRupee,
  content: ScrollText,
  audit: ClipboardList,
  inbox: Inbox,
  chart: BarChart3,
  settings: Settings,
} as const;

export interface AppNavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  exact?: boolean;
  badge?: number;
}

export function AppNav({ items }: { items: AppNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Section" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap text-foreground/70 transition-colors hover:bg-muted hover:text-ink",
              active && "bg-accent text-accent-foreground hover:bg-accent",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
