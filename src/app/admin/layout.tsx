import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import type { AppNavItem } from "@/components/layout/app-nav";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const NAV: AppNavItem[] = [
  { href: "/admin", label: "Overview", icon: "chart", exact: true },
  { href: "/admin/vehicles", label: "Vehicles", icon: "car" },
  { href: "/admin/batches", label: "Batches", icon: "groups" },
  { href: "/admin/quotations", label: "Quotations", icon: "quotes" },
  { href: "/admin/sales", label: "Enquiries & sales", icon: "sales" },
  { href: "/admin/commissions", label: "Commissions", icon: "money" },
  { href: "/admin/dealers", label: "Dealers", icon: "dealers" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/content", label: "Content & settings", icon: "content" },
  { href: "/admin/leads", label: "Leads", icon: "inbox" },
  { href: "/admin/messages", label: "Messages", icon: "inbox" },
  { href: "/admin/audit", label: "Audit log", icon: "audit" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireAdmin();
  return (
    <AppShell area="Admin" nav={NAV} user={{ name: viewer.profile?.full_name ?? "Admin", email: viewer.email, isAdmin: true, isDealer: viewer.isDealer }}>
      {children}
    </AppShell>
  );
}
