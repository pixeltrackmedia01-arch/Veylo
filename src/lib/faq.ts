import type { FaqItem } from "@/components/faq/faq-list";
import type { Faq } from "@/lib/types";

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function toFaqItems(faqs: Faq[]): FaqItem[] {
  return faqs.map((f) => ({ id: f.id, anchor: f.slug ?? slugify(f.question), question: f.question, answer: f.answer }));
}

/** schema.org FAQPage JSON-LD (answers as plain text). */
export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_#>`]/g, "") },
    })),
  };
}
