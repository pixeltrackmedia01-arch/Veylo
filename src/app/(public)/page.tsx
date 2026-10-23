import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Car,
  FileSearch,
  Handshake,
  ListChecks,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { BatchCard } from "@/components/catalogue/batch-card";
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

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/60 via-white to-white">
        <div className="pointer-events-none absolute -top-32 -right-32 size-[520px] rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1 text-sm font-semibold text-accent-foreground shadow-sm">
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" /> {hero.eyebrow}
            </span>
            <h1 className="text-balance text-4xl leading-[1.08] font-extrabold sm:text-5xl lg:text-6xl">{hero.headline}</h1>
            <p className="max-w-xl text-lg leading-8 text-foreground/75">{hero.subheadline}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/vehicles">
                  Explore Group Deals <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/how-it-works">How It Works</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Free to join · No obligation to buy · Discounts are not guaranteed
            </p>
          </div>

          <div className="relative">
            <div className="rounded-3xl border bg-white p-6 shadow-[var(--shadow-lift)] sm:p-8">
              <p className="text-sm font-semibold text-muted-foreground">How a group progresses</p>
              <ol className="mt-5 space-y-5">
                {[
                  { label: "Verified buyers join", detail: "Up to 20 per group, free of charge" },
                  { label: "Group closes", detail: "At 20 verified buyers or the deadline" },
                  { label: "Dealers quote", detail: "Itemised quotations from authorised dealers" },
                  { label: "We review & publish", detail: "Only reviewed quotations reach you" },
                  { label: "You decide", detail: "Buy directly from the dealership — or don't" },
                ].map((s, i) => (
                  <li key={s.label} className="flex gap-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-ink">{s.label}</p>
                      <p className="text-sm text-muted-foreground">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {stats ? (
                <div className="mt-6 grid grid-cols-3 gap-3 border-t pt-5 text-center">
                  <div>
                    <p className="font-display text-2xl font-bold text-ink">{formatNumber(stats.openGroups)}</p>
                    <p className="text-xs text-muted-foreground">Open groups</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-ink">{formatNumber(stats.verifiedParticipants)}</p>
                    <p className="text-xs text-muted-foreground">Verified in open groups</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-ink">{formatNumber(stats.vehicles)}</p>
                    <p className="text-xs text-muted-foreground">Vehicles listed</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page">{!configured ? <SetupNotice /> : null}</div>

      {/* Categories */}
      <section className="container-page py-14" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="text-2xl font-bold sm:text-3xl">
          What are you planning to buy?
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { href: "/vehicles?category=car", icon: Car, title: "Cars", body: "Hatchbacks, sedans and SUVs" },
            { href: "/vehicles?category=two_wheeler", icon: Bike, title: "Two-Wheelers", body: "Scooters and motorcycles" },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex items-center gap-5 rounded-2xl border bg-white p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <c.icon className="size-7" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-xl font-bold text-ink">{c.title}</span>
                <span className="text-sm text-muted-foreground">{c.body}</span>
              </span>
              <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {/* Featured groups */}
      <section className="bg-surface py-16" aria-labelledby="featured-heading">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 id="featured-heading" className="text-2xl font-bold sm:text-3xl">
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
        <h2 id="steps-heading" className="text-2xl font-bold sm:text-3xl">
          Three simple steps
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border bg-white p-7 shadow-[var(--shadow-card)]">
              <span className="absolute top-6 right-6 font-display text-5xl font-extrabold text-secondary">{i + 1}</span>
              <s.icon className="size-8 text-primary" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 leading-7 text-foreground/75">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-ink py-16 text-white" aria-labelledby="benefits-heading">
        <div className="container-page">
          <h2 id="benefits-heading" className="text-2xl font-bold text-white sm:text-3xl">
            Why buy as a group?
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-white/10 bg-white/5 p-7">
                <b.icon className="size-7 text-emerald-300" aria-hidden="true" />
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
            <li key={t} className="flex gap-3 rounded-xl border bg-white p-4">
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
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-br from-primary to-emerald-600 p-8 text-white sm:p-12 lg:flex-row lg:items-center">
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
