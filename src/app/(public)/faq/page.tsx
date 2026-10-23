import type { Metadata } from "next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getFaqs } from "@/lib/data/catalogue";
import { titleCase } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about joining buyer groups, verification, dealer quotations, privacy and how GroupDrive is paid.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faqs = await getFaqs();
  const groups = [...new Set(faqs.map((f) => f.category))];
  const jsonLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
      }
    : null;
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      ) : null}
      <h1 className="text-4xl font-extrabold">Frequently asked questions</h1>
      {faqs.length === 0 ? <p className="mt-6 text-muted-foreground">FAQs will appear here soon.</p> : null}
      {groups.map((g) => (
        <section key={g} className="mt-10" aria-labelledby={`faq-${g}`}>
          <h2 id={`faq-${g}`} className="text-xl font-bold">
            {titleCase(g)}
          </h2>
          <Accordion type="multiple" className="mt-3 rounded-2xl border bg-white px-6">
            {faqs
              .filter((f) => f.category === g)
              .map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger>{f.question}</AccordionTrigger>
                  <AccordionContent>{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
        </section>
      ))}
    </div>
  );
}
