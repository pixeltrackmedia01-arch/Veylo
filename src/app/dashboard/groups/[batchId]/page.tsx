import { ArrowLeft, Building2, CalendarClock, Mail, MapPin, Phone, TrendingDown } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnquiryDialog, IntentButtons, PurchaseClaimForm, QuotationDocumentButton } from "@/components/dashboard/customer-actions";
import { QuotationBreakdown } from "@/components/quotes/quotation-breakdown";
import { ActionButton } from "@/components/shared/action-button";
import { BatchStatusBadge, DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { leaveBatchAction, withdrawEnquiryAction } from "@/lib/actions/customer";
import { requireViewer } from "@/lib/auth/session";
import { getCurrentPrice } from "@/lib/data/catalogue";
import { getMyGroupDetail } from "@/lib/data/customer";
import { coordinationSummary } from "@/lib/domain/batch-lifecycle";
import { computeSavings } from "@/lib/domain/pricing";
import { formatDate, formatDateTime, formatINR, timeRemaining, todayInIndia } from "@/lib/format";
import { titleCase } from "@/lib/utils";

export default async function MyGroupPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const viewer = await requireViewer(`/dashboard/groups/${batchId}`);
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) notFound();
  const detail = await getMyGroupDetail(viewer.id, batchId);
  if (!detail) notFound();

  const { membership, intent, quotes, enquiries, bookings, sales } = detail;
  const batch = membership.batch;
  const vehicle = batch.variant.vehicle;
  const reference = await getCurrentPrice(batch.variant_id, batch.city_id);
  const today = todayInIndia();
  const verified = membership.status === "active" && membership.eligibility === "verified";

  return (
    <div className="space-y-8">
      <Link href="/dashboard/groups" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> My groups
      </Link>

      <div className="flex flex-col gap-4 rounded-3xl border bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <BatchStatusBadge status={batch.status} />
          <StatusBadge
            status={membership.status === "active" ? membership.eligibility : membership.status}
            label={
              membership.status !== "active"
                ? `Membership ${membership.status}`
                : membership.eligibility === "verified"
                  ? "Verified participant"
                  : membership.eligibility === "pending_verification"
                    ? "Verification pending"
                    : "Ineligible"
            }
          />
          {batch.is_demo ? <DemoBadge /> : null}
        </div>
        <div>
          <p className="text-muted-foreground">{vehicle.manufacturer.name}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {vehicle.model_name} · {batch.variant.name}
          </h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Verified participants</p>
            <p className="font-display text-xl font-bold">
              {batch.verified_participant_count} / {batch.target_participants}
            </p>
            <Progress className="mt-2" size="sm" value={batch.verified_participant_count} max={batch.target_participants} label="Group progress" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{batch.status === "open" ? "Closes" : "Closed"}</p>
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <CalendarClock className="size-4 text-primary" aria-hidden="true" />
              {formatDateTime(batch.status === "open" ? batch.deadline : (batch.closed_at ?? batch.deadline))}
            </p>
            {batch.status === "open" ? <p className="text-xs text-muted-foreground">{timeRemaining(batch.deadline)}</p> : null}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Delivery area</p>
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <MapPin className="size-4 text-primary" aria-hidden="true" /> {batch.city.name} · {batch.delivery_area}
            </p>
          </div>
        </div>
        <p className="text-sm text-foreground/80">{coordinationSummary(batch.status)}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/groups/${batch.slug}`}>Public group page</Link>
          </Button>
          {batch.status === "open" && membership.status === "active" ? (
            <ActionButton
              variant="ghost"
              size="sm"
              action={leaveBatchAction.bind(null, batch.id)}
              confirm={{ title: "Leave this group?", description: "You can rejoin while the group is open.", confirmLabel: "Leave group", destructive: true }}
            >
              Leave group
            </ActionButton>
          ) : null}
        </div>
      </div>

      {membership.eligibility === "pending_verification" && membership.status === "active" ? (
        <Alert variant="warning" title="You don't count toward the target yet">
          Complete your verification in <Link href="/dashboard/profile" className="font-semibold text-primary">Profile & settings</Link>.
          {batch.status !== "open" ? " This group has closed, so your membership will stay pending." : ""}
        </Alert>
      ) : null}

      {intent ? (
        <Card>
          <CardHeader>
            <CardTitle>Buying intent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {intent.status === "requested" ? (
              <>
                <p className="text-sm text-foreground/80">
                  Are you still planning to buy this vehicle? Your answer helps dealerships prepare. It is not a commitment.
                  {intent.respond_by ? ` Please respond by ${formatDate(intent.respond_by)}.` : ""}
                </p>
                <IntentButtons batchId={batch.id} />
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <StatusBadge status={intent.status} />
                <span className="text-muted-foreground">Answered {formatDateTime(intent.responded_at)}</span>
                <IntentButtons batchId={batch.id} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby="quotes" className="space-y-4">
        <h2 id="quotes" className="text-xl font-bold">
          Dealer quotations
        </h2>
        {!verified ? (
          <p className="text-sm text-muted-foreground">Quotations are shown to verified, active participants only.</p>
        ) : quotes.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-white p-6 text-sm text-muted-foreground">
            No reviewed quotations yet. We&apos;ll notify you as soon as one is published.
          </p>
        ) : (
          quotes.map((q) => {
            const enquiry = enquiries.find((e) => e.quotation_id === q.id);
            const booking = enquiry ? bookings.find((b) => b.enquiry_id === enquiry.id) : undefined;
            const sale = enquiry ? sales.find((s) => s.enquiry_id === enquiry.id) : undefined;
            const savings = computeSavings(
              reference
                ? { ...reference, variant_id: reference.variant_id, city_id: reference.city_id }
                : null,
              { variant_id: q.variant_id, city_id: batch.city_id, status: q.status, valid_until: q.valid_until, published_at: q.published_at, is_demo: q.is_demo, items: q.line_items },
              today,
            );
            const live = q.status === "published" && (q.valid_until ?? "") >= today;
            return (
              <Card key={q.id}>
                <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="size-5 text-primary" aria-hidden="true" /> {q.dealer?.name ?? "Authorised dealership"}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Dealer-confirmed quotation, reviewed by GroupDrive · published {formatDate(q.published_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total payable</p>
                    <p className="font-display text-2xl font-bold tabular-nums">{formatINR(q.total_payable)}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {!live ? (
                    <Alert variant="neutral">This quotation is {q.status === "published" ? "past its validity date" : q.status} and is shown for reference only.</Alert>
                  ) : null}
                  {savings.comparable ? (
                    <div className="flex items-start gap-3 rounded-xl bg-success-soft p-4 text-sm">
                      <TrendingDown className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                      <p>
                        <span className="font-semibold text-ink">
                          {formatINR(savings.saving)} ({savings.percent}%) below the verified reference price
                        </span>{" "}
                        of {formatINR(savings.reference)} for the same variant and charges in {batch.city.name}.
                        {savings.isDemo ? " Demo calculation." : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No savings figure shown: {savings.reason}</p>
                  )}
                  <QuotationBreakdown quote={q} items={q.line_items} />
                  <div className="flex flex-wrap gap-2">
                    {q.document_path ? <QuotationDocumentButton quotationId={q.id} /> : null}
                    {live && !enquiry ? <EnquiryDialog quotationId={q.id} dealerName={q.dealer?.name ?? "the dealership"} /> : null}
                  </div>

                  {enquiry ? (
                    <div className="space-y-4 rounded-2xl border bg-surface p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">Your enquiry</p>
                        <StatusBadge status={enquiry.status} />
                        {booking ? <StatusBadge status={booking.status} label={`Booking ${booking.status}`} /> : null}
                      </div>
                      {q.dealer ? (
                        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                          <li className="flex gap-2"><MapPin className="size-4 text-muted-foreground" aria-hidden="true" /> {q.dealer.branch_address}</li>
                          {q.dealer.contact_person ? <li>Contact: {q.dealer.contact_person}</li> : null}
                          {q.dealer.business_phone ? (
                            <li className="flex gap-2"><Phone className="size-4 text-muted-foreground" aria-hidden="true" /><a href={`tel:${q.dealer.business_phone}`}>{q.dealer.business_phone}</a></li>
                          ) : null}
                          {q.dealer.business_email ? (
                            <li className="flex gap-2"><Mail className="size-4 text-muted-foreground" aria-hidden="true" /><a href={`mailto:${q.dealer.business_email}`}>{q.dealer.business_email}</a></li>
                          ) : null}
                        </ul>
                      ) : null}
                      {booking ? (
                        <p className="text-sm">
                          Booked on {formatDate(booking.booking_date)}
                          {booking.booking_reference ? ` · ref. ${booking.booking_reference}` : ""}
                          {booking.expected_delivery_date ? ` · expected delivery ${formatDate(booking.expected_delivery_date)}` : ""}
                        </p>
                      ) : null}

                      {sale ? (
                        <div className="text-sm">
                          <p className="flex flex-wrap items-center gap-2">
                            Purchase verification: <StatusBadge status={sale.status} />
                          </p>
                          {sale.status === "evidence_requested" && sale.evidence_request_note ? (
                            <Alert variant="warning" className="mt-3" title="We need a little more information">
                              {sale.evidence_request_note}
                            </Alert>
                          ) : null}
                          {!sale.customer_confirmed_at && !["verified", "rejected"].includes(sale.status) ? (
                            <div className="mt-3">
                              <p className="mb-2 text-muted-foreground">The dealership reported a sale. Please confirm if you bought this vehicle.</p>
                              <PurchaseClaimForm enquiryId={enquiry.id} />
                            </div>
                          ) : null}
                          {sale.status === "evidence_requested" && sale.customer_confirmed_at ? (
                            <div className="mt-3">
                              <PurchaseClaimForm enquiryId={enquiry.id} />
                            </div>
                          ) : null}
                        </div>
                      ) : !["withdrawn", "closed_lost"].includes(enquiry.status) ? (
                        <details className="text-sm">
                          <summary className="cursor-pointer font-semibold text-primary">Bought this vehicle? Let us know</summary>
                          <div className="mt-3">
                            <PurchaseClaimForm enquiryId={enquiry.id} />
                          </div>
                        </details>
                      ) : null}

                      {!["withdrawn", "closed_lost", "booked"].includes(enquiry.status) ? (
                        <ActionButton
                          variant="ghost"
                          size="sm"
                          action={withdrawEnquiryAction.bind(null, enquiry.id)}
                          confirm={{ title: "Withdraw this enquiry?", description: "The dealership will see that you're no longer interested.", confirmLabel: "Withdraw" }}
                        >
                          Withdraw enquiry
                        </ActionButton>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      <Alert variant="info" title="Final terms come from the dealership">
        The final on-road price, offers, stock, financing, insurance, registration and delivery are confirmed by the dealership,
        and you purchase directly from them. Joining this group doesn&apos;t oblige you to buy. Enquiry status:{" "}
        {enquiries.length ? enquiries.map((e) => titleCase(e.status)).join(", ") : "none sent"}.
      </Alert>
    </div>
  );
}
