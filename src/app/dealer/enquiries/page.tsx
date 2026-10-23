import { Inbox, Mail, Phone } from "lucide-react";
import { BookingForm, DealerSaleClaimForm } from "@/components/dealer/dealer-actions";
import { ActionButton } from "@/components/shared/action-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { updateBookingStatusAction, updateEnquiryStatusAction } from "@/lib/actions/dealer";
import { requireDealer } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Booking, DealerEnquiry, SaleVerification } from "@/lib/types";

const NEXT_STATUSES: { status: string; label: string }[] = [
  { status: "contacted", label: "Contacted" },
  { status: "test_drive_scheduled", label: "Test drive scheduled" },
  { status: "negotiating", label: "Negotiating" },
];

export default async function DealerEnquiriesPage() {
  await requireDealer();
  const supabase = await createClient();
  const [{ data: enquiries }, { data: bookings }, { data: sales }] = await Promise.all([
    supabase.from("dealer_enquiries").select("*, batch:batches(title)").order("created_at", { ascending: false }).limit(200),
    supabase.from("bookings").select("*"),
    supabase.from("sale_verifications").select("*"),
  ]);
  const rows = (enquiries ?? []) as (DealerEnquiry & { batch: { title: string } })[];
  return (
    <div className="space-y-6">
      <PageHeader title="Enquiries & bookings" description="Customers who chose to share their contact details with you about a published quotation. Use them only for this enquiry." />
      {rows.length ? (
        <ul className="space-y-4">
          {rows.map((e) => {
            const booking = (bookings as Booking[] | null)?.find((b) => b.enquiry_id === e.id);
            const sale = (sales as SaleVerification[] | null)?.find((s) => s.enquiry_id === e.id);
            const closed = ["closed_lost", "withdrawn"].includes(e.status);
            return (
              <li key={e.id} className="space-y-4 rounded-2xl border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{e.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{e.batch.title} · received {formatDateTime(e.created_at)}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      {e.customer_phone ? <a href={`tel:${e.customer_phone}`} className="flex items-center gap-1 text-primary"><Phone className="size-4" aria-hidden="true" />{e.customer_phone}</a> : <span className="text-muted-foreground">Phone not shared</span>}
                      {e.customer_email ? <a href={`mailto:${e.customer_email}`} className="flex items-center gap-1 text-primary"><Mail className="size-4" aria-hidden="true" />{e.customer_email}</a> : null}
                    </div>
                    {e.customer_message ? <p className="mt-2 rounded-lg bg-muted p-2 text-sm">“{e.customer_message}”</p> : null}
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                {!closed && e.status !== "booked" ? (
                  <div className="flex flex-wrap gap-2">
                    {NEXT_STATUSES.filter((s) => s.status !== e.status).map((s) => (
                      <ActionButton key={s.status} size="sm" variant="outline" action={updateEnquiryStatusAction.bind(null, e.id, s.status)} reason={{ label: "Notes (optional, internal to your dealership)", optional: true }} confirm={{ title: `Mark as ${s.label.toLowerCase()}` }}>
                        {s.label}
                      </ActionButton>
                    ))}
                    <ActionButton size="sm" variant="ghost" action={updateEnquiryStatusAction.bind(null, e.id, "closed_lost")} reason={{ label: "Reason (optional)", optional: true }} confirm={{ title: "Close as lost?" }}>
                      Close as lost
                    </ActionButton>
                  </div>
                ) : null}
                {!closed && !booking ? (
                  <details className="rounded-xl border border-dashed p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">Record a booking</summary>
                    <div className="mt-3"><BookingForm enquiryId={e.id} /></div>
                  </details>
                ) : null}
                {booking ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3 text-sm">
                    <span>Booking {booking.booking_reference ?? ""} · {formatDate(booking.booking_date)}</span>
                    <StatusBadge status={booking.status} />
                    {booking.status === "booked" ? (
                      <>
                        <ActionButton size="sm" variant="outline" action={updateBookingStatusAction.bind(null, booking.id, "delivered")} confirm={{ title: "Mark delivered?" }}>Mark delivered</ActionButton>
                        <ActionButton size="sm" variant="ghost" action={updateBookingStatusAction.bind(null, booking.id, "cancelled")} reason={{ label: "Cancellation reason" }} confirm={{ title: "Cancel booking?" }}>Cancel booking</ActionButton>
                      </>
                    ) : null}
                  </div>
                ) : null}
                {sale ? (
                  <p className="text-sm">Sale claim: <StatusBadge status={sale.status} /> {sale.evidence_request_note && sale.status === "evidence_requested" ? <span className="text-muted-foreground">— {sale.evidence_request_note}</span> : null}</p>
                ) : null}
                {!closed && (!sale || sale.status === "evidence_requested") ? (
                  <details className="rounded-xl border border-dashed p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">{sale ? "Add evidence" : "Report completed sale"}</summary>
                    <p className="mt-2 text-xs text-muted-foreground">GroupDrive verifies every sale with the customer and evidence. Dealers cannot verify their own sales.</p>
                    <div className="mt-3"><DealerSaleClaimForm enquiryId={e.id} /></div>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={Inbox} title="No enquiries yet" description="Enquiries arrive after your quotation is published and a participant chooses to contact you." />
      )}
    </div>
  );
}
