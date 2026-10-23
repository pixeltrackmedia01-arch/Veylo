import { Bike, Car, ChevronDown, LayoutDashboard, LogOut, Shield, Store, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getViewer } from "@/lib/auth/session";
import { MobileNav } from "./mobile-nav";

export const NAV_LINKS = [
  { href: "/vehicles?category=car", label: "Cars", icon: Car },
  { href: "/vehicles?category=two_wheeler", label: "Two-Wheelers", icon: Bike },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  const viewer = await getViewer();
  const displayName = viewer?.profile?.full_name ?? viewer?.email ?? "Account";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {viewer ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                  <User aria-hidden="true" />
                  <span className="max-w-36 truncate">{displayName}</span>
                  <ChevronDown aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Signed in as {viewer.email}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard /> My dashboard
                  </Link>
                </DropdownMenuItem>
                {viewer.isDealer ? (
                  <DropdownMenuItem asChild>
                    <Link href="/dealer">
                      <Store /> Dealer portal
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {viewer.isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield /> Admin
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <form action={signOut}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full">
                      <LogOut /> Sign out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/vehicles">Join a Group</Link>
              </Button>
            </>
          )}
          <MobileNav signedIn={Boolean(viewer)} isAdmin={viewer?.isAdmin ?? false} isDealer={viewer?.isDealer ?? false} />
        </div>
      </div>
    </header>
  );
}
