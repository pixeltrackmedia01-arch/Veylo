import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import type { AppNavItem } from "@/components/layout/app-nav";
import { requireDealer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dealer portal", robots: { index: false, follow: false } };

const NAV: AppNavItem[] = [
  { href: "/dealer", label: "Overview", icon: "dashboard", exact: true },
  { href: "/dealer/requests", label: "Quotation requests", icon: "quotes" },
  { href: "/dealer/enquiries", label: "Enquiries & bookings", icon: "inbox" },
  { href: "/dealer/sales", label: "Sale claims", icon: "sales" },
  { href: "/dealer/commissions", label: "Commissions", icon: "money" },
];

export default async function DealerLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireDealer();
  return (
    <AppShell area="Dealer" nav={NAV} user={{ name: viewer.profile?.full_name ?? "Dealer", email: viewer.email, isAdmin: viewer.isAdmin, isDealer: true }}>
      {children}
    </AppShell>
  );
}
