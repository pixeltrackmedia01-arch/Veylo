import { CalendarClock, CircleCheck, CircleX, Lock, MapPin, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JoinGroupButton } from "@/components/catalogue/join-group-button";
import { BatchStatusBadge, DemoBadge } from "@/components/shared/status-badge";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getViewer } from "@/lib/auth/session";
import { getBatchBySlug, getFaqs } from "@/lib/data/catalogue";
import { faqJsonLd, toFaqItems } from "@/lib/faq";
import { FaqList } from "@/components/faq/faq-list";
import { JsonLd } from "@/components/faq/json-ld";
import { coordinationSummary, isJoinable, spotsLeft } from "@/lib/domain/batch-lifecycle";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDateTime, formatINR, timeRemaining } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { BatchMembership, DealerQuotation } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSupabaseConfigured()) return {};
  const { slug } = await params;
  const batch = await getBatchBySlug(slug);
  if (!batch) return { title: "Group not found" };
  const description = `${batch.verified_participant_count} of ${batch.target_participants} verified participants. Free to join; closes ${formatDateTime(batch.deadline)}.`;
  return { title: batch.title, description, alternates: { canonical: `/groups/${batch.slug}` }, openGraph: { title: batch.title, description } };
}

const TIMELINE = [
  { key: "open", label: "Collecting verified participants" },
  { key: "closed", label: "Group closes (target or deadline)" },
  { key: "requested", label: "Quotations requested from authorised dealers" },
  { key: "review", label: "Quotations reviewed by GroupDrive" },
  { key: "published", label: "Reviewed quotations shared with participants" },
];

function timelineIndex(status: string) {
  switch (status) {
    case "open":
      return 0;
    case "target_reached":
    case "closed_deadline":
      return 1;
    case "quotation_requested":
      return 2;
    case "quotation_review":
      return 3;
    case "quotes_published":
    case "purchase_in_progress":
    case "completed":
      return 4;
    default:
      return -1;
  }
}

export default async function GroupPage({ params }: Props) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
  const batch = await getBatchBySlug(slug);
  if (!batch) notFound();

  const viewer = await getViewer();
  let membership: BatchMembership | null = null;
  let quotes: (DealerQuotation & { dealer: { name: string } | null })[] = [];
  if (viewer) {
    const supabase = await createClient();
    const [m, q] = await Promise.all([
      supabase.from("batch_memberships").select("*").eq("batch_id", batch.id).eq("user_id", viewer.id).maybeSingle(),
      // RLS returns only quotations published to verified participants of this batch.
      supabase.from("dealer_quotations").select("*, dealer:dealers(name)").eq("batch_id", batch.id).eq("status", "published"),
    ]);
    membership = (m.data as BatchMembership | null) ?? null;
    quotes = (q.data ?? []) as typeof quotes;
  }

  const vehicle = batch.variant.vehicle;
  const joinable = isJoinable(batch);
  const step = timelineIndex(batch.status);

  const faqItems = toFaqItems((await getFaqs("joining")).slice(0, 6));

  return (
    <div className="pb-16">
      <section className="border-b bg-gradient-to-b from-accent/50 to-white">
        <div className="container-page grid gap-10 py-10 lg:grid-cols-[1.4fr_1fr] lg:py-14">
          <div className="space-y-5">
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
              <Link href="/vehicles" className="hover:text-ink">Vehicles</Link> /{" "}
              <Link href={`/vehicles/${vehicle.slug}`} className="hover:text-ink">
                {vehicle.manufacturer.name} {vehicle.model_name}
              </Link>
            </nav>
            <div className="flex flex-wrap gap-2">
              <BatchStatusBadge status={batch.status} />
              {batch.is_demo ? <DemoBadge /> : null}
            </div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{batch.title}</h1>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border bg-white p-4">
                <dt className="text-muted-foreground">Exact vehicle</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {vehicle.manufacturer.name} {vehicle.model_name} — {batch.variant.name}
                </dd>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-4" aria-hidden="true" /> City & delivery area
                </dt>
                <dd className="mt-1 font-semibold text-ink">
                  {batch.city.name} · {batch.delivery_area}
                </dd>
              </div>
            </dl>
            <VehicleImage
              image={vehicle.images?.[0]}
              category={vehicle.category}
              bodyType={vehicle.body_type}
              alt={`${vehicle.manufacturer.name} ${vehicle.model_name}`}
              priority
              className="aspect-[16/8] rounded-3xl border bg-white"
            />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border bg-white p-6 shadow-[var(--shadow-lift)]">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Users className="size-4 text-primary" aria-hidden="true" /> Verified participants
              </p>
              <p className="mt-2 font-display text-4xl font-extrabold text-ink">
                {batch.verified_participant_count}
                <span className="text-xl font-semibold text-muted-foreground"> / {batch.target_participants}</span>
              </p>
              <Progress className="mt-4" value={batch.verified_participant_count} max={batch.target_participants} label="Group progress" />
              <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                <span>{batch.status === "open" ? `${spotsLeft(batch)} ${spotsLeft(batch) === 1 ? "spot" : "spots"} left` : "Closed for joining"}</span>
                <span className="flex items-center gap-1">
                  <CalendarClock className="size-4" aria-hidden="true" />
                  {batch.status === "open" ? timeRemaining(batch.deadline) : "Closed"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {batch.status === "open" ? "Closes" : "Deadline was"} {formatDateTime(batch.deadline)} IST, or when {batch.target_participants} verified
                participants join — whichever comes first.
              </p>
              <div className="mt-6">
                <JoinGroupButton
                  batchId={batch.id}
                  slug={batch.slug}
                  joinable={joinable}
                  signedIn={Boolean(viewer)}
                  membership={membership ? { status: membership.status, eligibility: membership.eligibility } : null}
                  batchOpen={batch.status === "open"}
                />
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Free to join · No joining or registration fee · No obligation to buy
              </p>
            </div>
          </aside>
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-10">
          <section aria-labelledby="coordination-heading">
            <h2 id="coordination-heading" className="text-2xl font-bold">
              Dealer quotation status
            </h2>
            <p className="mt-2 text-foreground/80">{coordinationSummary(batch.status)}</p>
            {step >= 0 ? (
              <ol className="mt-6 space-y-4">
                {TIMELINE.map((t, i) => (
                  <li key={t.key} className="flex items-center gap-3">
                    <span
                      className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                        i < step ? "bg-primary text-white" : i === step ? "bg-accent text-accent-foreground ring-2 ring-primary" : "bg-secondary text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className={i <= step ? "font-medium text-ink" : "text-muted-foreground"}>
                      {t.label}
                      {i === step ? <span className="sr-only"> (current stage)</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
            {batch.status === "cancelled" && batch.cancelled_reason ? (
              <Alert variant="warning" className="mt-4" title="Cancelled">
                {batch.cancelled_reason}
              </Alert>
            ) : null}
          </section>

          <section aria-labelledby="quotes-heading">
            <h2 id="quotes-heading" className="text-2xl font-bold">
              Reviewed quotations
            </h2>
            {quotes.length ? (
              <ul className="mt-4 space-y-3">
                {quotes.map((q) => (
                  <li key={q.id} className="flex flex-col justify-between gap-3 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold text-ink">{q.dealer?.name ?? "Authorised dealership"}</p>
                      <p className="text-sm text-muted-foreground">
                        Dealer-confirmed quotation · valid until {q.valid_until}
                        {q.is_demo ? " · demo data" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-display text-xl font-bold tabular-nums">{formatINR(q.total_payable)}</p>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/groups/${batch.id}`}>View breakdown</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-dashed bg-white p-5 text-sm text-muted-foreground">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Reviewed, itemised quotations are shown only to verified participants of this group, and only after our team
                approves them for publication. Drafts and unreviewed quotations are never shown as offers.
              </p>
            )}
          </section>

          <section aria-labelledby="when-closes" className="space-y-3">
            <h2 id="when-closes" className="text-2xl font-bold">
              What happens when the group closes
            </h2>
            <ul className="space-y-2 text-[15px] leading-7 text-foreground/80">
              <li>• If {batch.target_participants} verified participants join, the group closes immediately.</li>
              <li>
                • Otherwise it closes at the deadline. With at least {batch.minimum_participants} verified participants we still
                request quotations; with fewer, the group expires and no quotations are requested.
              </li>
              <li>• We request itemised quotations from authorised dealerships for this exact variant in {batch.city.name}.</li>
              <li>• We may ask you to reconfirm that you still intend to buy.</li>
              <li>• You review published quotations and, if you wish, contact the dealership. You buy directly from them.</li>
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-bold">Benefits</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                "Free to join and leave while open",
                "Itemised quotations for the exact variant",
                "Every quotation reviewed before you see it",
                "Your details stay private until you choose to contact a dealer",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {b}
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-lg font-bold">Limitations</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                "No guaranteed discount — dealers decide what to offer",
                "Dealers may decline to quote",
                "Stock, delivery dates and offers can change",
                "Final terms are agreed with the dealership",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <CircleX className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" /> Eligibility & privacy
            </h2>
            <p className="mt-3 text-sm leading-6 text-foreground/80">
              {batch.eligibility_rules ?? `Open to residents of ${batch.city.name} who plan to buy this variant.`} To count as a
              verified participant you need a verified email, a mobile number and {batch.city.name} as your city.
            </p>
            <p className="mt-3 text-sm leading-6 text-foreground/80">
              Other participants can&apos;t see who you are. Dealers receive your contact details only if you send them an
              enquiry about a published quotation.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">Target: {batch.target_participants}</Badge>
              <Badge variant="outline">Minimum for quotes: {batch.minimum_participants}</Badge>
            </div>
          </div>
        </aside>
      </div>

      <div className="container-page">
        <Alert variant="info" title="Please note">
          Participation does not guarantee a discount, a quotation or a purchase. The final on-road price, offers, stock,
          financing, insurance, registration and delivery are confirmed by the dealership.
        </Alert>
      </div>

      {faqItems.length ? (
        <section className="container-page mt-10" aria-labelledby="group-faq">
          <JsonLd data={faqJsonLd(faqItems)} />
          <div className="rounded-2xl border bg-white px-5 pt-5 pb-1 shadow-[var(--shadow-card)] sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="group-faq" className="text-xl font-bold">
                How this group works
              </h2>
              <Link href="/faq" className="text-sm font-semibold text-primary hover:underline">
                All FAQs →
              </Link>
            </div>
            <FaqList items={faqItems} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
