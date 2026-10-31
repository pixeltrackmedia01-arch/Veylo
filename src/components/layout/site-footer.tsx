import { Mail, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { siteConfig } from "@/config/site";

type FooterLink = { href: string; label: string };

// Static on purpose: the footer renders on every page and must not cost a
// database round trip. Keep the slugs in step with the catalogue.
const DISCOVERY: { title: string; links: FooterLink[] }[] = [
  {
    title: "Popular car brands",
    links: [
      { href: "/cars/maruti-suzuki", label: "Maruti Suzuki cars" },
      { href: "/cars/hyundai", label: "Hyundai cars" },
      { href: "/cars/tata-motors", label: "Tata cars" },
      { href: "/cars/mahindra", label: "Mahindra cars" },
      { href: "/cars/toyota", label: "Toyota cars" },
      { href: "/cars/kia", label: "Kia cars" },
      { href: "/cars/honda-cars", label: "Honda cars" },
      { href: "/cars/mg-motor", label: "MG cars" },
    ],
  },
  {
    title: "Popular cars",
    links: [
      { href: "/cars/maruti-suzuki-swift", label: "Maruti Suzuki Swift" },
      { href: "/cars/hyundai-creta", label: "Hyundai Creta" },
      { href: "/cars/maruti-suzuki-brezza", label: "Maruti Suzuki Brezza" },
      { href: "/cars/tata-nexon", label: "Tata Nexon" },
      { href: "/cars/mahindra-scorpio-n", label: "Mahindra Scorpio N" },
      { href: "/cars/maruti-suzuki-fronx", label: "Maruti Suzuki Fronx" },
      { href: "/cars/maruti-suzuki-dzire", label: "Maruti Suzuki Dzire" },
      { href: "/cars/kia-seltos", label: "Kia Seltos" },
    ],
  },
  {
    title: "Cars by type & budget",
    links: [
      { href: "/cars?body=suv", label: "SUVs" },
      { href: "/cars?body=hatchback", label: "Hatchbacks" },
      { href: "/cars?body=sedan", label: "Sedans" },
      { href: "/cars?body=muv", label: "7-seater MUVs" },
      { href: "/cars?fuel=electric", label: "Electric cars" },
      { href: "/cars?budget=u5", label: "Cars under ₹5 lakh" },
      { href: "/cars?budget=5-10", label: "Cars ₹5–10 lakh" },
      { href: "/cars?budget=10-15", label: "Cars ₹10–15 lakh" },
    ],
  },
  {
    title: "Bikes & scooters",
    links: [
      { href: "/vehicles?category=two_wheeler", label: "All bikes & scooters" },
      { href: "/vehicles?category=two_wheeler&manufacturer=hero", label: "Hero bikes" },
      { href: "/vehicles?category=two_wheeler&manufacturer=honda-2w", label: "Honda two-wheelers" },
      { href: "/vehicles?category=two_wheeler&manufacturer=tvs", label: "TVS bikes & scooters" },
      { href: "/vehicles?category=two_wheeler&manufacturer=bajaj", label: "Bajaj bikes" },
      { href: "/vehicles?category=two_wheeler&manufacturer=royal-enfield", label: "Royal Enfield" },
      { href: "/vehicles/honda-2w-activa-110", label: "Honda Activa 110" },
      { href: "/vehicles/hero-splendor-plus", label: "Hero Splendor Plus" },
    ],
  },
];

const SITE: { title: string; links: FooterLink[] }[] = [
  {
    title: "Tools",
    links: [
      { href: "/emi-calculator", label: "EMI calculator" },
      { href: "/compare", label: "Compare cars" },
      { href: "/groups", label: "Group deals" },
      { href: "/cars", label: "New cars" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms & conditions" },
      { href: "/disclaimer", label: "Disclaimer" },
      { href: "/sitemap.xml", label: "Sitemap" },
    ],
  },
];

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-surface">
      <nav aria-label="Browse vehicles" className="container-page grid grid-cols-2 gap-8 border-b py-10 md:grid-cols-4">
        {DISCOVERY.map((col) => (
          <LinkColumn key={col.title} {...col} />
        ))}
      </nav>
      <div className="container-page grid gap-10 py-10 md:grid-cols-[1.6fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            New car, bike and scooter prices, variants, specifications and free group deals across India. You buy directly from an
            authorised dealership; we never charge buyers a fee.
          </p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {siteConfig.contact.email && !siteConfig.contact.email.endsWith("@example.com") ? (
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <a href={`mailto:${siteConfig.contact.email}`} className="hover:text-primary">
                  {siteConfig.contact.email}
                </a>
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <Clock className="size-4 shrink-0" aria-hidden="true" /> {siteConfig.contact.hours}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden="true" /> {siteConfig.contact.address}
            </li>
          </ul>
        </div>
        {SITE.map((col) => (
          <LinkColumn key={col.title} {...col} />
        ))}
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Prices are indicative ex-showroom figures; the dealership confirms the
            final price, offers, stock, financing, insurance, registration and delivery.
          </p>
          <p>Joining a group never guarantees a discount or a purchase.</p>
        </div>
      </div>
    </footer>
  );
}
