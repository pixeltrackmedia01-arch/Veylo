import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth-actions";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { AppNav, type AppNavItem } from "./app-nav";

/** Shared chrome for the customer dashboard, admin area and dealer portal. */
export function AppShell({
  area,
  nav,
  user,
  children,
}: {
  area: string;
  nav: AppNavItem[];
  user: { name: string; email: string | null; isAdmin?: boolean; isDealer?: boolean };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface lg:flex-row">
      <aside className="border-b bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center justify-between gap-2 px-4 lg:px-5">
          <Logo />
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold tracking-wide text-accent-foreground uppercase">{area}</span>
        </div>
        <AppNav items={nav} />
        <div className="hidden border-t p-4 lg:mt-auto lg:block">
          <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.isAdmin && area !== "Admin" ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/admin">Admin</Link>
              </Button>
            ) : null}
            {user.isDealer && area !== "Dealer" ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/dealer">Dealer</Link>
              </Button>
            ) : null}
            {area !== "Customer" ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard">My account</Link>
              </Button>
            ) : null}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-ink">
              Website <ExternalLink className="size-3" aria-hidden="true" />
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-xs font-semibold text-muted-foreground hover:text-destructive">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
