import { ArrowRight, BadgeCheck, CarFront, ClipboardCheck, FileSearch, Handshake, KeyRound, ListChecks, MailCheck, Search, Store, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description: "How GroupDrive buyer groups work, from choosing a variant to buying directly from an authorised dealership.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  { icon: Search, title: "Browse available vehicles", body: "Explore cars and two-wheelers with buyer groups in Surat. Reference prices show their source and the date they were checked." },
  { icon: CarFront, title: "Select a specific model and variant", body: "Every group is for one exact variant, so dealer quotations can be compared like-for-like." },
  { icon: KeyRound, title: "Create an account or sign in", body: "We ask only for what we need: your name, email, mobile number, city, preferred vehicle category and expected purchase timeline." },
  { icon: MailCheck, title: "Verify your details", body: "Confirm your email address. Where mobile verification is enabled, you'll also confirm your number with a one-time code. Only verified participants count toward a group." },
  { icon: Users, title: "Join the group for free", body: "There is no registration fee and no joining fee. You can leave at any time while the group is open." },
  { icon: ClipboardCheck, title: "Confirm your buying intent when asked", body: "Before or after the group closes we may ask whether you still plan to buy. It helps dealers prepare accurate quotations; it is not a commitment." },
  { icon: FileSearch, title: "We coordinate dealer quotations", body: "When the group reaches 20 verified participants or its deadline, we request itemised quotations from authorised dealerships for that variant." },
  { icon: ListChecks, title: "Review approved quotations and contact the dealership", body: "Our team checks each quotation before publishing it in your dashboard. If you're interested, send an enquiry — only then does the dealership receive your contact details." },
  { icon: Store, title: "Purchase directly from the dealership", body: "You agree the final on-road price, offers, stock, financing, insurance, registration and delivery directly with the dealership and pay them directly." },
  { icon: BadgeCheck, title: "We verify completed sales", body: "A sale is recorded only after it's verified with supporting evidence. Dealers can't verify their own sales." },
];

export default function HowItWorksPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-primary">How it works</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Buy together, decide on your own terms</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Ten clear steps — and you&apos;re never charged, never obligated, and never shown an unreviewed quotation.
        </p>
      </div>

      <ol className="mt-12 grid gap-5 md:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-5 rounded-2xl border bg-white p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-col items-center gap-2">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <s.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="font-display text-sm font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{s.title}</h2>
              <p className="mt-1.5 leading-7 text-foreground/75">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Alert variant="info" title="Reaching 20 isn't a promise">
          A full group triggers quotation coordination. It does not guarantee a discount, a quotation or a vehicle. If a
          group has too few verified participants at its deadline, it expires without quotations.
        </Alert>
        <Alert variant="success" title="How GroupDrive is paid">
          Dealerships may pay us a commission after a verified completed sale, under a written agreement. You never pay us.
        </Alert>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/groups">
            Explore Group Deals <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/faq">
            <Handshake aria-hidden="true" /> Read the FAQ
          </Link>
        </Button>
      </div>
    </div>
  );
}
