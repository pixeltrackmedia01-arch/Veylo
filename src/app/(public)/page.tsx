import {
  ArrowRight,
  BadgeCheck,
  Car,
  FileSearch,
  Handshake,
  ListChecks,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BatchCard } from "@/components/catalogue/batch-card";
import { BrandMarquee } from "@/components/home/brand-marquee";
import { BrandShowcase } from "@/components/home/brand-showcase";
import { HeroSearch } from "@/components/home/hero-search";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getFaqs, getPlatformStats, getPublicSetting, listPublicBatches } from "@/lib/data/catalogue";
import { isSupabaseConfigured } from "@/lib/env";
import { formatNumber } from "@/lib/format";

const HERO_DEFAULT = {
  eyebrow: `Now live in ${siteConfig.launchCity.name}`,
  headline: "Buy your next vehicle together, decide with clearer quotes.",
  subheadline:
    "Join a free buyer group for the exact model and variant you want. When the group closes, we ask authorised dealerships for itemised quotations that we review before you see them.",
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

const BENEFITS = [
  {
    icon: Users,
    title: "Collective buyer interest",
    body: "Dealers see a group of verified, local buyers interested in the same variant — a clearer signal than one-off enquiries.",
  },
  {
    icon: ListChecks,
    title: "Transparent, itemised quotations",
    body: "Ex-showroom, registration, insurance, accessories and other charges are listed separately, with what is included and excluded.",
  },
  {
    icon: Scale,
    title: "Informed, unhurried decisions",
    body: "Compare reviewed quotations side by side, then talk to the dealership directly. You are never obliged to buy.",
  },
];

const TRUST_POINTS = [
  "Joining is free. We never charge customers a registration or joining fee.",
  "We earn a commission from a dealership only after a verified completed sale, under a written agreement with that dealership.",
  "Only verified participants count toward a group's target — never page views or unverified sign-ups.",
  "Every quotation is reviewed before publication. Drafts are never shown as offers.",
  "We show savings only against a verified reference price for the same variant and city.",
  "You buy directly from an authorised dealership, which confirms the final price, offers, stock, financing, insurance, registration and delivery.",
];

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  const [hero, featured, stats, faqs] = configured
    ? await Promise.all([
        getPublicSetting("home.hero", HERO_DEFAULT),
        listPublicBatches({ status: "open", limit: 6 }),
        getPlatformStats(),
        getFaqs(),
      ])
    : [HERO_DEFAULT, [], null, []];

  const sortedFeatured = [...featured].sort(
    (a, b) => b.verified_participant_count / b.target_participants - a.verified_participant_count / a.target_participants,
  );
  const spotlight = sortedFeatured[0];

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" aria-hidden="true" />
        <div className="absolute -top-40 -left-40 -z-10 size-[560px] rounded-full bg-primary/30 blur-[120px]" aria-hidden="true" />
        <div className="absolute -right-40 -bottom-48 -z-10 size-[520px] rounded-full bg-sky-500/20 blur-[120px]" aria-hidden="true" />
        <div className="container-page grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm font-semibold text-emerald-200 backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              {hero.eyebrow}
            </span>
            <h1 className="text-balance text-4xl leading-[1.05] font-extrabold text-white sm:text-5xl lg:text-6xl">
              {hero.headline}
            </h1>
            <p className="max-w-xl text-lg leading-8 text-white/70">{hero.subheadline}</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-white/80">
              {[
                { icon: BadgeCheck, label: "₹0 joining fee" },
                { icon: Users, label: "Groups of 20 verified buyers" },
                { icon: ShieldCheck, label: "Reviewed, itemised quotes" },
              ].map((t) => (
                <li key={t.label} className="flex items-center gap-2">
                  <t.icon className="size-5 text-emerald-400" aria-hidden="true" /> {t.label}
                </li>
              ))}
            </ul>
            {stats ? (
              <dl className="grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
                {[
                  { value: stats.openGroups, label: "Open groups" },
                  { value: stats.verifiedParticipants, label: "Buyers in groups" },
                  { value: stats.vehicles, label: "Vehicles listed" },
                ].map((s) => (
                  <div key={s.label}>
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="font-display text-3xl font-extrabold text-white">{formatNumber(s.value)}</dd>
                    <dd className="text-xs text-white/60">{s.label}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          <div className="relative">
            <HeroSearch />
            {spotlight ? (
              <Link
                href={`/groups/${spotlight.slug}`}
                className="animate-float group mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition-colors hover:bg-white/15"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                  <Users className="size-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold tracking-wider text-emerald-300 uppercase">Filling fast</span>
                  <span className="block truncate font-semibold text-white">
                    {spotlight.variant.vehicle.manufacturer.name} {spotlight.variant.vehicle.model_name} · {spotlight.variant.name}
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/15">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                      style={{ width: `${Math.min(100, (spotlight.verified_participant_count / spotlight.target_participants) * 100)}%` }}
                    />
                  </span>
                  <span className="mt-1.5 block text-xs text-white/65">
                    {spotlight.verified_participant_count} of {spotlight.target_participants} verified buyers joined
                    {spotlight.is_demo ? " · demo" : ""}
                  </span>
                </span>
                <ArrowRight className="size-5 text-white/60 transition-transform group-hover:translate-x-1 group-hover:text-white" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
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

      {/* Featured groups */}
      <section className="bg-surface py-16" aria-labelledby="featured-heading">
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
              <span className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-white shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
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

      {/* Benefits */}
      <section className="relative isolate overflow-hidden bg-ink py-20 text-white" aria-labelledby="benefits-heading">
        <div className="absolute top-0 left-1/2 -z-10 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" aria-hidden="true" />
        <div className="container-page">
          <p className="text-sm font-bold tracking-widest text-emerald-300 uppercase">The group advantage</p>
          <h2 id="benefits-heading" className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
            Why buy as a group?
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="group rounded-3xl border border-white/10 bg-white/5 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-white/10"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-400/15 transition-colors group-hover:bg-emerald-400/25">
                  <b.icon className="size-6 text-emerald-300" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-white">{b.title}</h3>
                <p className="mt-2 leading-7 text-white/75">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
      {faqs.length ? (
        <section className="bg-surface py-16" aria-labelledby="faq-heading">
          <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <h2 id="faq-heading" className="text-2xl font-bold sm:text-3xl">
                Frequently asked questions
              </h2>
              <p className="mt-3 text-muted-foreground">
                More answers on our <Link href="/faq" className="font-semibold text-primary underline-offset-4 hover:underline">FAQ page</Link>.
              </p>
            </div>
            <Accordion type="single" collapsible className="rounded-2xl border bg-white px-6">
              {faqs.slice(0, 6).map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger>{f.question}</AccordionTrigger>
                  <AccordionContent>{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="container-page py-16">
        <div className="relative isolate flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-emerald-600 to-teal-700 p-8 text-white shadow-xl shadow-primary/20 sm:p-12 lg:flex-row lg:items-center">
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
