import Link from "next/link";
import { notFound } from "next/navigation";
import { FileLinkButton } from "@/components/quotes/file-link-button";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCommissionAction, reviewSaleAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { calculateCommission, selectAgreement } from "@/lib/domain/commission";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Commission, CommissionAgreement, SaleVerification } from "@/lib/types";

export default async function AdminSalePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sale_verifications")
    .select("*, dealer:dealers(id, name), enquiry:dealer_enquiries(customer_name, customer_email, customer_phone, status), booking:bookings(booking_reference, booking_date, status), batch:batches(title), variant:vehicle_variants(id, name, vehicle:vehicles(id, model_name, manufacturer_id))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const sale = data as SaleVerification & {
    dealer: { id: string; name: string };
    enquiry: { customer_name: string; customer_email: string | null; customer_phone: string | null; status: string };
    booking: { booking_reference: string | null; booking_date: string; status: string } | null;
    batch: { title: string };
    variant: { id: string; name: string; vehicle: { id: string; model_name: string; manufacturer_id: string } };
  };
  const [{ data: agreements }, { data: commission }, { data: quote }] = await Promise.all([
    supabase.from("commission_agreements").select("*").eq("status", "active"),
    supabase.from("commissions").select("*").eq("sale_verification_id", id).maybeSingle(),
    supabase.from("dealer_quotations").select("total_payable").eq("id", (await supabase.from("dealer_enquiries").select("quotation_id").eq("id", sale.enquiry_id).single()).data?.quotation_id ?? "").maybeSingle(),
  ]);
  const agreement = selectAgreement((agreements ?? []) as CommissionAgreement[], {
    dealerId: sale.dealer_id,
    batchId: sale.batch_id,
    variantId: sale.variant_id,
    vehicleId: sale.variant.vehicle.id,
    manufacturerId: sale.variant.vehicle.manufacturer_id,
    saleDate: sale.sale_date,
  });
  const conflicted = viewer.dealerIds.includes(sale.dealer_id);
  const decided = ["verified", "rejected"].includes(sale.status);
  const act = (a: string) => reviewSaleAction.bind(null, sale.id, a);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={<Link href="/admin/sales">← Sales</Link>} title={`Sale claim · ${sale.dealer.name}`} description={<StatusBadge status={sale.status} />} />
      {conflicted ? <Alert variant="danger" title="Conflict of interest">You are linked to this dealership and cannot verify its sales.</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Claim</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Batch</dt><dd>{sale.batch.title}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Vehicle</dt><dd>{sale.variant.vehicle.model_name} · {sale.variant.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Sale date</dt><dd>{formatDate(sale.sale_date)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Invoice / reference</dt><dd>{sale.invoice_number ?? "—"} / {sale.sale_reference ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Claimed by</dt><dd>{sale.claimed_by_role} · {formatDateTime(sale.created_at)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Customer confirmed</dt><dd>{sale.customer_confirmed_at ? formatDateTime(sale.customer_confirmed_at) : "Not yet"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Customer</dt><dd>{sale.enquiry.customer_name} · {sale.enquiry.customer_phone ?? sale.enquiry.customer_email}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Booking</dt><dd>{sale.booking ? `${sale.booking.booking_reference ?? "—"} · ${formatDate(sale.booking.booking_date)} · ${sale.booking.status}` : "None recorded"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Published quotation total</dt><dd>{formatINR(quote?.total_payable)}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {sale.evidence_paths.length ? sale.evidence_paths.map((p, i) => <FileLinkButton key={p} bucket="sale-evidence" path={p} label={`Evidence ${i + 1}`} />) : <span className="text-sm text-muted-foreground">No evidence uploaded.</span>}
            </div>
            {sale.evidence_request_note ? <p className="mt-3 text-sm text-muted-foreground">Evidence requested: {sale.evidence_request_note}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Commission</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {commission ? (
              <>
                <p>Recorded: <strong>{formatINR((commission as Commission).final_amount)}</strong> · <StatusBadge status={(commission as Commission).status} /></p>
                <Link href="/admin/commissions" className="text-primary hover:underline">Manage in Commissions</Link>
              </>
            ) : agreement ? (
              <>
                <p>
                  Applicable agreement: <strong>{agreement.name}</strong> ({agreement.calc_type === "fixed" ? `${formatINR(agreement.fixed_amount)} per verified sale` : `${agreement.percentage}% of “${agreement.basis_label}”`}
                  {agreement.cap_amount ? `, capped at ${formatINR(agreement.cap_amount)}` : ""}).
                </p>
                {agreement.calc_type === "fixed" ? (
                  <p className="text-muted-foreground">Commission on verification: {formatINR(calculateCommission(agreement, null))}</p>
                ) : (
                  <p className="text-muted-foreground">Enter the basis amount from the evidence when verifying: {agreement.basis_description ?? agreement.basis_label}</p>
                )}
              </>
            ) : (
              <Alert variant="warning">No active agreement matches this dealer and vehicle. You can still verify the sale; create an agreement, then generate the commission.</Alert>
            )}
            {sale.status === "verified" && !commission ? (
              <ActionButton size="sm" action={createCommissionAction.bind(null, sale.id)} valueField={{ label: "Commission basis amount (₹) — only for percentage agreements", type: "number" }} confirm={{ title: "Generate commission", description: "Uses the agreement in force on the sale date." }}>
                Generate commission
              </ActionButton>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {!decided && !conflicted ? (
        <Card>
          <CardHeader><CardTitle>Verification</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <ActionButton action={act("verify")} valueField={agreement?.calc_type === "percentage" ? { label: `Basis amount (₹): ${agreement.basis_label}`, type: "number", required: true } : undefined} reason={{ label: "Verification notes (what evidence did you check?)" }} confirm={{ title: "Verify this completed sale?", description: "Only verify after checking the invoice or delivery evidence. This creates the commission record." }}>
              Verify sale
            </ActionButton>
            {sale.status === "claimed" ? <ActionButton variant="outline" action={act("start_review")}>Start review</ActionButton> : null}
            <ActionButton variant="outline" action={act("request_evidence")} reason={{ label: "What evidence is needed? (sent to customer and dealer)" }} confirm={{ title: "Request evidence" }}>
              Request evidence
            </ActionButton>
            <ActionButton variant="destructive" action={act("reject")} reason={{ label: "Rejection reason" }} confirm={{ title: "Reject sale claim", destructive: true, confirmLabel: "Reject" }}>
              Reject
            </ActionButton>
          </CardContent>
        </Card>
      ) : null}
      {sale.admin_notes ? <p className="text-sm text-muted-foreground">Admin notes: {sale.admin_notes}</p> : null}
    </div>
  );
}
