import { ChevronDown, Heart, LayoutDashboard, LogOut, Shield, Store, User } from "lucide-react";
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
import { HeaderNav } from "./header-nav";
import { HeaderSearch } from "./header-search";
import { MobileNav } from "./mobile-nav";

export async function SiteHeader() {
  const viewer = await getViewer();
  const displayName = viewer?.profile?.full_name ?? viewer?.email ?? "Account";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/95 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <HeaderNav />
        </div>

        <div className="flex items-center gap-2">
          <HeaderSearch />
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
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/saved">
                    <Heart /> Saved cars
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
            <Button asChild size="sm" className="hidden rounded-xl sm:inline-flex">
              <Link href="/login">
                <User aria-hidden="true" /> Login
              </Link>
            </Button>
          )}
          <MobileNav signedIn={Boolean(viewer)} isAdmin={viewer?.isAdmin ?? false} isDealer={viewer?.isDealer ?? false} />
        </div>
      </div>
    </header>
  );
}
