import { ArrowRight, BadgePercent, CalendarClock, PiggyBank, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmiPageCalculator } from "@/components/cars/emi-page-calculator";
import { type FaqItem, FaqList } from "@/components/faq/faq-list";
import { JsonLd } from "@/components/faq/json-ld";
import { siteConfig } from "@/config/site";
import { getFaqs } from "@/lib/data/catalogue";
import { getCars } from "@/lib/data/cars";
import { isSupabaseConfigured } from "@/lib/env";
import { faqJsonLd, slugify, toFaqItems } from "@/lib/faq";
import { formatINR, formatPriceLakh } from "@/lib/format";
import { absoluteUrl, breadcrumbJsonLd, SEO_YEAR } from "@/lib/seo";

const TITLE = `Car Loan EMI Calculator ${SEO_YEAR} – Monthly EMI, Interest & Down Payment`;
const DESCRIPTION =
  "Free car loan EMI calculator for India. Pick any new car and variant or enter a price, set down payment, interest rate and tenure, and see your monthly EMI, total interest and repayment schedule.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | ${siteConfig.name}` },
  description: DESCRIPTION,
  keywords: [
    "car loan EMI calculator",
    "car EMI calculator",
    "EMI calculator for car",
    "car loan calculator India",
    "new car loan EMI",
    "car loan interest calculator",
    "auto loan EMI calculator",
    "car EMI per month",
    "down payment calculator car",
    "car finance calculator",
    "on-road price EMI",
  ],
  alternates: { canonical: "/emi-calculator" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/emi-calculator",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const D = siteConfig.emi;

const GUIDE_FAQS: { question: string; answer: string }[] = [
  {
    question: "How is car loan EMI calculated?",
    answer:
      "EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), where P is the loan amount, r is the monthly interest rate (annual rate ÷ 12 ÷ 100) and n is the number of monthly instalments. Most Indian banks use this reducing-balance method, so interest is charged only on the amount still outstanding.",
  },
  {
    question: "Should I use the ex-showroom or on-road price?",
    answer:
      "Use the on-road price. It adds registration (RTO), road tax, insurance and other charges to the ex-showroom price, and it is the amount a lender actually finances (minus your down payment). When you pick a car above, the calculator uses its estimated on-road price.",
  },
  {
    question: "How much down payment should I make on a new car?",
    answer:
      "A down payment of 20% or more is a common rule of thumb. Paying more upfront lowers both the EMI and the total interest, and some lenders offer better rates when the loan-to-value ratio is lower.",
  },
  {
    question: "Is a longer tenure better?",
    answer:
      "A longer tenure (6–7 years) gives a smaller EMI but you pay noticeably more interest over the life of the loan. Compare tenures in the table above: pick the shortest tenure whose EMI fits comfortably in your monthly budget.",
  },
  {
    question: "How much EMI can I afford?",
    answer:
      "Many advisers suggest keeping your car EMI within 10–15% of your monthly take-home pay, and all EMIs together under about 40%. The calculator shows the income you would need to keep the EMI under 15%.",
  },
  {
    question: "Does the calculator include processing fees and insurance?",
    answer:
      "No. Lenders may add a processing fee, documentation charges and optional loan insurance. Ask for these in writing and compare the total cost, not just the interest rate.",
  },
];

const TIPS = [
  { icon: Wallet, title: "Pay more upfront", text: "Every extra 10% down cuts the loan, the EMI and the interest you pay." },
  { icon: CalendarClock, title: "Keep the tenure short", text: "Choose the shortest tenure whose EMI still fits your monthly budget." },
  { icon: BadgePercent, title: "Compare lender rates", text: "Half a percent lower can save thousands. Check banks, NBFCs and the brand's own finance." },
  { icon: PiggyBank, title: "Mind the extras", text: "Processing fees, insurance and prepayment charges change the real cost of the loan." },
];

const POPULAR = [
  "maruti-suzuki-swift",
  "hyundai-creta",
  "tata-nexon",
  "maruti-suzuki-brezza",
  "mahindra-scorpio-n",
  "kia-seltos",
  "maruti-suzuki-dzire",
  "maruti-suzuki-fronx",
  "toyota-innova-hycross",
  "hyundai-venue",
  "mahindra-xuv-3xo",
  "skoda-kylaq",
];

export default async function EmiCalculatorPage({ searchParams }: { searchParams: Promise<{ car?: string }> }) {
  const { car } = await searchParams;
  const [cars, faqs] = isSupabaseConfigured() ? await Promise.all([getCars(), getFaqs("loans")]) : [[], []];
  const options = [...cars]
    .sort((a, b) => `${a.manufacturer.name} ${a.model_name}`.localeCompare(`${b.manufacturer.name} ${b.model_name}`))
    .map((c) => ({
      slug: c.slug,
      id: c.id,
      label: `${c.manufacturer.name} ${c.model_name}`,
      brand: c.manufacturer.name,
      variants: c.variantsWithPrice.map((v) => ({ id: v.id, name: v.name, onRoad: v.onRoad, exShowroom: v.exShowroom })),
    }));

  const dbItems = toFaqItems(faqs);
  // The guide already answers these topics; skip database questions that repeat them.
  const covered = /calculat|down payment|tenure/i;
  const items: FaqItem[] = [
    ...GUIDE_FAQS.map((f) => ({ anchor: slugify(f.question), ...f })),
    ...dbItems.filter((i) => !covered.test(i.question)),
  ];
  const bySlug = new Map(cars.map((c) => [c.slug, c]));
  const popular = POPULAR.map((s) => bySlug.get(s)).filter((c) => c && c.emiFrom).slice(0, 8);

  return (
    <div className="bg-surface pb-16">
      <JsonLd data={faqJsonLd(items)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Car loan EMI calculator", path: "/emi-calculator" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Car Loan EMI Calculator",
          url: absoluteUrl("/emi-calculator"),
          applicationCategory: "FinanceApplication",
          operatingSystem: "Any",
          description: DESCRIPTION,
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        }}
      />

      <section className="border-b bg-white">
        <div className="container-page py-8 sm:py-10">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>{" "}
            <span aria-hidden="true">/</span> <span className="text-ink">EMI calculator</span>
          </nav>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Car loan <span className="text-primary">EMI calculator</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Pick a car or type a price, then adjust the down payment, interest rate and tenure. Your EMI, total interest and repayment plan update as
            you go.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-xs">
            {[`Starts at ${D.downPaymentPct}% down`, `${D.annualRatePct}% p.a. typical rate`, `${D.tenureMonths / 12}-year default`, "Free, no sign-up"].map(
              (t) => (
                <li key={t} className="rounded-full border bg-surface px-3 py-1 font-medium text-ink">
                  {t}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      <div className="container-page mt-6">
        <EmiPageCalculator cars={options} initialCar={options.some((o) => o.slug === car) ? car : undefined} />

        {popular.length ? (
          <section aria-labelledby="emi-popular" className="mt-12">
            <h2 id="emi-popular" className="text-xl font-bold text-ink">
              EMI for popular cars
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Starting EMI on the base variant with {D.downPaymentPct}% down at {D.annualRatePct}% for {D.tenureMonths / 12} years.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map((c) => (
                <li key={c!.slug}>
                  <Link
                    href={`/emi-calculator?car=${c!.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {c!.manufacturer.name} {c!.model_name}
                      </span>
                      <span className="block text-xs text-muted-foreground">From {formatPriceLakh(c!.fromPrice)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-extrabold text-primary">{formatINR(c!.emiFrom)}</span>
                      <span className="flex items-center justify-end gap-0.5 text-[11px] text-muted-foreground">
                        per month <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="emi-how" className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 id="emi-how" className="text-xl font-bold text-ink">
              How car loan EMI is calculated
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Banks and NBFCs in India work out car loan EMIs on a reducing balance, so each month you pay interest only on what you still owe.
            </p>
            <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-center font-mono text-sm font-semibold text-ink">
              EMI = P × r × (1 + r)<sup>n</sup> ÷ ((1 + r)<sup>n</sup> − 1)
            </p>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              {[
                ["P", "Loan amount (on-road price minus down payment)"],
                ["r", "Monthly rate: annual rate ÷ 12 ÷ 100"],
                ["n", "Number of monthly instalments"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border p-3">
                  <dt className="font-bold text-primary">{k}</dt>
                  <dd className="text-xs text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              <strong className="text-ink">Example:</strong> a ₹10 lakh on-road car with 20% down leaves a ₹8 lakh loan. At 9.5% for 5 years the EMI is
              about ₹16,800 and the total interest about ₹2.08 lakh.
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-xl font-bold text-ink">Four ways to lower your EMI</h2>
            <ul className="mt-4 space-y-4">
              {TIPS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{title}</span>
                    <span className="block text-sm text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <Link href="/compare" className="rounded-full border px-3 py-1.5 font-medium text-ink hover:border-primary hover:text-primary">
                Compare cars
              </Link>
              <Link href="/cars?budget=5-10" className="rounded-full border px-3 py-1.5 font-medium text-ink hover:border-primary hover:text-primary">
                Cars ₹5–10 lakh
              </Link>
              <Link href="/groups" className="rounded-full border px-3 py-1.5 font-medium text-ink hover:border-primary hover:text-primary">
                Join a group deal
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="emi-faq">
          <h2 id="emi-faq" className="text-xl font-bold text-ink">
            Car loan &amp; EMI questions
          </h2>
          <FaqList items={items} feedback={false} className="mt-2" />
        </section>
      </div>
    </div>
  );
}
