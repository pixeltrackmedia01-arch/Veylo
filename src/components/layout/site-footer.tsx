import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { siteConfig } from "@/config/site";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/cars", label: "New Cars" },
      { href: "/vehicles?category=two_wheeler", label: "Two-Wheelers" },
      { href: "/groups", label: "All group deals" },
      { href: "/emi-calculator", label: "EMI Calculator" },
      { href: "/compare", label: "Compare Cars" },
      { href: "/how-it-works", label: "How It Works" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/disclaimer", label: "Disclaimer" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Free group buying for cars and two-wheelers in {siteConfig.launchCity.name}. You buy directly from an authorised
            dealership; we never charge a joining fee.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold text-ink">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Prices, offers, stock, financing, insurance, registration and
            delivery are confirmed by the dealership.
          </p>
          <p>Joining a group never guarantees a discount or a purchase.</p>
        </div>
      </div>
    </footer>
  );
}
