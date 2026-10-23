import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex flex-1 flex-col bg-gradient-to-b from-accent/60 via-white to-white">
      <div className="container-page flex h-16 items-center">
        <Logo />
      </div>
      <div className="flex flex-1 items-start justify-center px-4 py-8 sm:py-14">
        <div className="w-full max-w-lg rounded-3xl border bg-white p-6 shadow-[var(--shadow-lift)] sm:p-9">{children}</div>
      </div>
      <p className="pb-8 text-center text-xs text-muted-foreground">
        <Link href="/terms" className="hover:underline">Terms</Link> · <Link href="/privacy" className="hover:underline">Privacy</Link> · Joining is always free
      </p>
    </main>
  );
}
