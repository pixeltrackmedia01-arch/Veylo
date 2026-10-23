import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import type { AppNavItem } from "@/components/layout/app-nav";
import { requireViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My dashboard", robots: { index: false, follow: false } };

const NAV: AppNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "dashboard", exact: true },
  { href: "/dashboard/groups", label: "My groups", icon: "groups" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "bell" },
  { href: "/dashboard/profile", label: "Profile & settings", icon: "profile" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer("/dashboard");
  return (
    <AppShell
      area="Customer"
      nav={NAV}
      user={{ name: viewer.profile?.full_name ?? "Your account", email: viewer.email, isAdmin: viewer.isAdmin, isDealer: viewer.isDealer }}
    >
      {children}
    </AppShell>
  );
}
