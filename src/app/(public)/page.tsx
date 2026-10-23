import {
  ArrowRight,
  BadgeCheck,
  Car,
  FileSearch,
  Handshake,
  ShieldCheck,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BatchCard } from "@/components/catalogue/batch-card";
import { BrandMarquee } from "@/components/home/brand-marquee";
import { BrandShowcase } from "@/components/home/brand-showcase";
import { CarCard } from "@/components/cars/car-card";
import { FaqList } from "@/components/faq/faq-list";
import { JsonLd } from "@/components/faq/json-ld";
import { GroupVsSolo } from "@/components/home/group-vs-solo";
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getFaqs, getPlatformStats, getPublicSetting, listPublicBatches } from "@/lib/data/catalogue";
import { getCars, getSavedVehicleIds } from "@/lib/data/cars";
import { getViewer } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { formatNumber } from "@/lib/format";
import { faqJsonLd, toFaqItems } from "@/lib/faq";

const HERO_DEFAULT: { eyebrow: string; headline: string; highlight?: string; subheadline: string } = {
  eyebrow: `Now live in ${siteConfig.launchCity.name}`,
  headline: "Better car deals happen in numbers",
  highlight: "in numbers",
  subheadline:
    "Team up with buyers who want the same model. Dealers compete for the whole group, and you decide whether to buy — free, no strings attached.",
};

const STEPS = [
  {
    icon: Car,
    title: "Choose a vehicle",
    body: "Pick the exact model and variant you plan to buy. Every group is for one specific variant, so quotations are comparable.",
  },
  {
    icon: Users,
    title: "Join a group for free",
    body: "Create an account, verify your details and join. No registration fee, no joining fee — ever. Leave any time while the group is open.",
  },
  {
    icon: FileSearch,
    title: "Review dealer quotations",
    body: "When the group reaches 20 verified buyers or its deadline, we request itemised quotations from authorised dealers and review them before publishing.",
  },
];

const TRUST_POINTS = [
  "Joining is free. We never charge customers a registration or joining fee.",
  "We earn a commission from a dealership only after a verified completed sale, under a written agreement with that dealership.",
  "Only verified participants count toward a group's target — never page views or unverified sign-ups.",
  "Every quotation is reviewed before publication. Drafts are never shown as offers.",
  "Headline savings are estimates. On a group page we show a saving only against a verified reference price for the same variant and city.",
  "You buy directly from an authorised dealership, which confirms the final price, offers, stock, financing, insurance, registration and delivery.",
];

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  const [hero, heroImage, featured, stats, faqs, cars] = configured
    ? await Promise.all([
        getPublicSetting("home.hero", HERO_DEFAULT),
        getPublicSetting<{ url?: string; alt?: string } | null>("home.hero_image", null),
        listPublicBatches({ status: "open", limit: 6 }),
        getPlatformStats(),
        getFaqs(),
        getCars(),
      ])
    : [HERO_DEFAULT, null, [], null, [], []];

  const viewer = configured ? await getViewer() : null;
  const saved = await (configured ? getSavedVehicleIds(viewer?.id) : Promise.resolve(new Set<string>()));
  const featuredFaqs = faqs.filter((f) => f.featured);
  const faqItems = toFaqItems((featuredFaqs.length ? featuredFaqs : faqs).slice(0, 8));
  const popularCars = [...cars].sort((a, b) => b.popularity - a.popularity).slice(0, 6);

  const sortedFeatured = [...featured].sort(
    (a, b) => b.verified_participant_count / b.target_participants - a.verified_participant_count / a.target_participants,
  );

  const photo = heroImage?.url ? { url: heroImage.url, alt: heroImage.alt ?? "" } : null;
  const slides: HeroSlide[] = [
    {
      eyebrow: hero.eyebrow,
      title: hero.headline,
      highlight: hero.highlight,
      text: hero.subheadline,
      cta: { label: "Explore group deals", href: "/groups" },
      secondary: { label: "How it works", href: "/how-it-works" },
      image: photo,
      car: { body: "suv", colour: "#b3121b" },
      glow: "#4a0f17",
      chip: stats?.openGroups ? `● ${formatNumber(stats.openGroups)} groups open now · ${formatNumber(stats.verifiedParticipants)} buyers already in` : undefined,
    },
    {
      eyebrow: "Group power",
      title: "20 buyers. One car. Sharper quotes.",
      highlight: "Sharper quotes.",
      text: "When a group fills up, authorised dealers send itemised quotations — checked by our team before they reach you.",
      cta: { label: "See open groups", href: "/groups" },
      secondary: { label: "Read the FAQ", href: "/faq" },
      car: { body: "sedan", colour: "#1f4fa3" },
      glow: "#0f2547",
    },
    {
      eyebrow: "New cars",
      title: "Know the real price before the showroom",
      highlight: "real price",
      text: `${cars.length || "30"}+ popular cars with variant-wise prices, specs, mileage and on-road estimates for ${siteConfig.launchCity.name}.`,
      cta: { label: "Browse new cars", href: "/cars" },
      secondary: { label: "Compare cars", href: "/compare" },
      car: { body: "hatchback", colour: "#e0661f" },
      glow: "#4a2410",
    },
    {
      eyebrow: "Plan smart",
      title: "Find an EMI that fits your month",
      highlight: "fits your month",
      text: "Slide the down payment, interest rate and tenure — see your monthly EMI and total cost instantly.",
      cta: { label: "Open EMI calculator", href: "/emi-calculator" },
      car: { body: "muv", colour: "#1f6b7a" },
      glow: "#0d3438",
    },
  ];

  return (
    <>
      <HeroCarousel slides={slides} />

      {/* Trust strip */}
      <section className="border-b bg-white" aria-label="Why buyers trust us">
        <ul className="container-page grid grid-cols-2 gap-4 py-5 text-sm sm:py-6 lg:grid-cols-4">
          {[
            { icon: BadgeCheck, title: "₹0 to join", text: "No registration or joining fee" },
            { icon: Users, title: "Verified buyers only", text: "Real, local buyers fill each group" },
            { icon: ShieldCheck, title: "Quotes we check", text: "Itemised and reviewed before you see them" },
            { icon: Handshake, title: "Your call, always", text: "Buy direct from the dealer — or don't" },
          ].map((t) => (
            <li key={t.title} className="group flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition-transform group-hover:scale-110">
                <t.icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold text-ink">{t.title}</span>
                <span className="text-muted-foreground">{t.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Brand strip */}
      <section className="border-b bg-white" aria-label="Brands available">
        <div className="container-page">
          <BrandMarquee />
        </div>
      </section>

      <div className="container-page">{!configured ? <SetupNotice /> : null}</div>

      {/* Brands */}
      <section className="container-page py-16 sm:py-20" aria-labelledby="brands-heading">
        <BrandShowcase />
      </section>

      {/* Categories */}
      <section className="container-page pb-16" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="sr-only">
          Browse by vehicle type
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              href: "/vehicles?category=car",
              image: "/images/placeholders/suv.svg",
              title: "Cars",
              body: "Hatchbacks, sedans and SUVs",
              tint: "from-emerald-50 to-teal-100",
            },
            {
              href: "/vehicles?category=two_wheeler",
              image: "/images/placeholders/scooter.svg",
              title: "Two-wheelers",
              body: "Scooters, motorcycles and EVs",
              tint: "from-sky-50 to-indigo-100",
            },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`group relative flex min-h-48 items-center justify-between gap-4 overflow-hidden rounded-3xl bg-gradient-to-br ${c.tint} p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] sm:p-9`}
            >
              <span className="relative z-10">
                <span className="block text-3xl font-extrabold text-ink">{c.title}</span>
                <span className="mt-1 block text-foreground/70">{c.body}</span>
                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-primary">
                  Explore <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </span>
              <Image
                src={c.image}
                alt=""
                width={240}
                height={140}
                unoptimized
                className="w-28 shrink-0 transition-transform duration-500 group-hover:translate-x-2 group-hover:scale-110 sm:w-56"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Popular cars */}
      {popularCars.length ? (
        <section className="bg-surface py-16" aria-labelledby="popular-heading">
          <div className="container-page">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold tracking-widest text-primary uppercase">New cars</p>
                <h2 id="popular-heading" className="mt-2 text-3xl font-extrabold sm:text-4xl">
                  Popular new cars
                </h2>
                <p className="mt-2 text-muted-foreground">Indicative {siteConfig.launchCity.name} prices, specs and EMI estimates.</p>
              </div>
              <Button asChild variant="outline">
                <Link href="/cars">
                  View all cars <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {popularCars.map((c) => (
                <CarCard key={c.id} car={c} saved={saved.has(c.id)} signedIn={Boolean(viewer)} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Featured groups */}
      <section className="py-16" aria-labelledby="featured-heading">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold tracking-widest text-primary uppercase">Live groups</p>
              <h2 id="featured-heading" className="mt-2 text-3xl font-extrabold sm:text-4xl">
                Groups open now in {siteConfig.launchCity.name}
              </h2>
              <p className="mt-2 text-muted-foreground">Participant counts include verified participants only.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/vehicles">
                See all vehicles <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          {sortedFeatured.length ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedFeatured.map((b) => (
                <BatchCard key={b.id} batch={b} />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-2xl border border-dashed bg-white p-10 text-center text-muted-foreground">
              No groups are open right now. New groups are added regularly — check back soon.
            </p>
          )}
        </div>
      </section>

      {/* Steps */}
      <section className="container-page py-16" aria-labelledby="steps-heading">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-widest text-primary uppercase">How it works</p>
          <h2 id="steps-heading" className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Three simple steps
          </h2>
        </div>
        <div className="relative mt-12 grid gap-6 md:grid-cols-3">
          <div
            className="absolute top-14 right-[16%] left-[16%] hidden h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 md:block"
            aria-hidden="true"
          />
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="group relative rounded-3xl border bg-white p-7 text-center shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-rose-500 text-white shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <s.icon className="size-8" aria-hidden="true" />
                <span className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white ring-4 ring-white">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-6 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 leading-7 text-foreground/75">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <GroupVsSolo />

      {/* Trust */}
      <section className="container-page grid gap-10 py-16 lg:grid-cols-2" aria-labelledby="trust-heading">
        <div>
          <ShieldCheck className="size-9 text-primary" aria-hidden="true" />
          <h2 id="trust-heading" className="mt-4 text-2xl font-bold sm:text-3xl">
            How we operate — plainly
          </h2>
          <p className="mt-3 max-w-lg leading-7 text-foreground/75">
            Group buying only works if you can trust the numbers. These are the rules the platform is built on, and they are
            enforced in our systems, not just written here.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/how-it-works">Read the full process</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/disclaimer">Disclaimer</Link>
            </Button>
          </div>
        </div>
        <ul className="grid gap-3">
          {TRUST_POINTS.map((t) => (
            <li
              key={t}
              className="flex gap-3 rounded-xl border bg-white p-4 transition-all hover:border-primary/30 hover:shadow-[var(--shadow-card)]"
            >
              <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-[15px] leading-6 text-foreground/85">{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      {faqItems.length ? (
        <section className="bg-surface py-16" aria-labelledby="faq-heading">
          <JsonLd data={faqJsonLd(faqItems)} />
          <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="text-sm font-bold tracking-widest text-primary uppercase">FAQ</p>
              <h2 id="faq-heading" className="mt-2 text-3xl font-extrabold sm:text-4xl">
                Frequently asked questions
              </h2>
              <p className="mt-3 text-muted-foreground">Quick answers to what buyers ask most.</p>
              <Button asChild variant="outline" className="mt-6">
                <Link href="/faq">
                  View all FAQs <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="rounded-2xl border bg-white px-6 shadow-[var(--shadow-card)]">
              <FaqList items={faqItems} />
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="container-page py-16">
        <div className="relative isolate flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-rose-700 to-[#5c0b14] p-8 text-white shadow-xl shadow-primary/20 sm:p-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Planning a purchase in the next few months?</h2>
            <p className="mt-2 max-w-xl text-white/85">Find a group for your exact variant. It is free, and you can leave while the group is open.</p>
          </div>
          <Button asChild size="lg" variant="ink">
            <Link href="/vehicles">
              <Handshake aria-hidden="true" /> Explore Group Deals
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
