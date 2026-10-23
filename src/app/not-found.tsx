import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Logo />
      <p className="font-display text-6xl font-extrabold text-primary">404</p>
      <h1 className="text-2xl font-bold">We couldn&apos;t find that page</h1>
      <p className="max-w-md text-muted-foreground">The page may have moved, or the group may no longer be available.</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/vehicles">Explore Group Deals</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
