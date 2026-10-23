import { Calculator } from "lucide-react";
import type { Metadata } from "next";
import { EmiPageCalculator } from "@/components/cars/emi-page-calculator";
import { FaqList } from "@/components/faq/faq-list";
import { JsonLd } from "@/components/faq/json-ld";
import { siteConfig } from "@/config/site";
import { getFaqs } from "@/lib/data/catalogue";
import { getCars } from "@/lib/data/cars";
import { isSupabaseConfigured } from "@/lib/env";
import { faqJsonLd, toFaqItems } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Car Loan EMI Calculator",
  description: "Work out your monthly car loan EMI, total interest and total cost. Pick a car and variant to use its estimated on-road price.",
  alternates: { canonical: "/emi-calculator" },
};

export default async function EmiCalculatorPage({ searchParams }: { searchParams: Promise<{ car?: string }> }) {
  const { car } = await searchParams;
  const [cars, faqs] = isSupabaseConfigured() ? await Promise.all([getCars(), getFaqs("loans")]) : [[], []];
  const options = [...cars]
    .sort((a, b) => `${a.manufacturer.name} ${a.model_name}`.localeCompare(`${b.manufacturer.name} ${b.model_name}`))
    .map((c) => ({
      slug: c.slug,
      id: c.id,
      label: `${c.manufacturer.name} ${c.model_name}`,
      variants: c.variantsWithPrice.map((v) => ({ id: v.id, name: v.name, onRoad: v.onRoad, exShowroom: v.exShowroom })),
    }));
  const items = toFaqItems(faqs);

  return (
    <div className="bg-surface pb-16">
      {items.length ? <JsonLd data={faqJsonLd(items)} /> : null}
      <section className="relative isolate overflow-hidden bg-[#0b0d10] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_20%,#3a1016_0%,#0b0d10_60%)]" aria-hidden="true" />
        <div className="container-page py-12 sm:py-16">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/40">
            <Calculator className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-5xl">Car Loan EMI Calculator</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/75">
            See your monthly instalment, total interest and total cost before you talk to a lender. Defaults: {siteConfig.emi.downPaymentPct}% down,{" "}
            {siteConfig.emi.annualRatePct}% interest, {siteConfig.emi.tenureMonths / 12} years.
          </p>
        </div>
      </section>
      <div className="container-page -mt-6 max-w-5xl">
        <EmiPageCalculator cars={options} initialCar={options.some((o) => o.slug === car) ? car : undefined} />
        {items.length ? (
          <section className="mt-10 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="emi-faq">
            <h2 id="emi-faq" className="text-xl font-bold">
              Car loan &amp; EMI questions
            </h2>
            <FaqList items={items} className="mt-2" />
          </section>
        ) : null}
      </div>
    </div>
  );
}
