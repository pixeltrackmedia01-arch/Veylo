"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { signOut } from "@/app/auth-actions";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/groups", label: "Group Deals" },
  { href: "/cars", label: "New Cars" },
  { href: "/vehicles?category=two_wheeler", label: "Two-Wheelers" },
  { href: "/emi-calculator", label: "EMI Calculator" },
  { href: "/compare", label: "Compare Cars" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function MobileNav({ signedIn, isAdmin, isDealer }: { signedIn: boolean; isAdmin: boolean; isDealer: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <Logo />
        <nav aria-label="Mobile" className="mt-4 flex flex-col">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={close} className="rounded-lg px-2 py-3 text-base font-medium text-ink hover:bg-muted">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t pt-4">
          {signedIn ? (
            <>
              <Button asChild variant="outline" onClick={close}>
                <Link href="/dashboard">My dashboard</Link>
              </Button>
              {isDealer ? (
                <Button asChild variant="outline" onClick={close}>
                  <Link href="/dealer">Dealer portal</Link>
                </Button>
              ) : null}
              {isAdmin ? (
                <Button asChild variant="outline" onClick={close}>
                  <Link href="/admin">Admin</Link>
                </Button>
              ) : null}
              <form action={signOut}>
                <Button type="submit" variant="ghost" className="w-full">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild onClick={close}>
                <Link href="/signup">Join a Group — free</Link>
              </Button>
              <Button asChild variant="outline" onClick={close}>
                <Link href="/login">Login</Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
