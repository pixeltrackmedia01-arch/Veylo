import { Mail, MessageCircleQuestion, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaqBrowser } from "@/components/faq/faq-browser";
import { JsonLd } from "@/components/faq/json-ld";
import { siteConfig } from "@/config/site";
import { getFaqs, getPublicSetting } from "@/lib/data/catalogue";
import { faqJsonLd, toFaqItems } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about group buying, joining a group, prices and savings, dealer quotations, buying and delivery, car loans, insurance and privacy.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const [faqs, contact] = await Promise.all([getFaqs(), getPublicSetting<{ email: string; phone: string; address: string; hours: string }>("contact.public", siteConfig.contact)]);
  const items = toFaqItems(faqs).map((item, i) => ({ ...item, category: faqs[i].category }));

  return (
    <div className="bg-surface pb-16">
      {items.length ? <JsonLd data={faqJsonLd(items)} /> : null}
      <section className="relative isolate overflow-hidden bg-[#0b0d10] pt-14 pb-20 text-center text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,#3a1016_0%,#0b0d10_65%)]" aria-hidden="true" />
        <div className="container-page">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/40">
            <MessageCircleQuestion className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-5xl">Frequently Asked Questions</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-white/75">
            Everything about buying your car as a group: how it works, prices, quotations, loans and more.
          </p>
        </div>
      </section>

      <div className="container-page">
        {items.length ? <FaqBrowser faqs={items} /> : <p className="mt-10 text-center text-muted-foreground">FAQs will appear here soon.</p>}

        <section className="mx-auto mt-12 max-w-3xl rounded-3xl bg-ink p-8 text-white sm:p-10" aria-labelledby="still-questions">
          <h2 id="still-questions" className="text-2xl font-bold text-white">
            Still have questions?
          </h2>
          <p className="mt-2 text-white/75">Our team usually replies within one working day ({contact.hours}).</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-bold transition-colors hover:bg-primary-hover">
              <MessageCircleQuestion className="size-4" aria-hidden="true" /> Contact us
            </Link>
            {contact.phone ? (
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-5 font-semibold transition-colors hover:bg-white/20">
                <Phone className="size-4" aria-hidden="true" /> {contact.phone}
              </a>
            ) : null}
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-5 font-semibold transition-colors hover:bg-white/20">
                <Mail className="size-4" aria-hidden="true" /> {contact.email}
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
