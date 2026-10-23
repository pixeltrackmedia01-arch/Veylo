import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailabilityForm } from "@/components/dealer/dealer-actions";
import { QuotationDocumentUpload } from "@/components/quotes/document-upload";
import { FileLinkButton } from "@/components/quotes/file-link-button";
import { QuotationBreakdown } from "@/components/quotes/quotation-breakdown";
import { QuotationEditor } from "@/components/quotes/quotation-editor";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitQuotationAction, withdrawQuotationAction } from "@/lib/actions/dealer";
import { requireDealer } from "@/lib/auth/session";
import { todayInIndia } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { DealerQuotation, QuotationLineItem } from "@/lib/types";

export default async function DealerQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireDealer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  // RLS returns nothing for another dealership's quotation, so this 404s.
  const { data } = await supabase
    .from("dealer_quotations")
    .select("*, line_items:quotation_line_items(*), batch:batches(title, verified_participant_count, variant:vehicle_variants(name, vehicle:vehicles(model_name, manufacturer:manufacturers(name))))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const quote = data as DealerQuotation & { line_items: QuotationLineItem[]; batch: { title: string; verified_participant_count: number; variant: { name: string; vehicle: { model_name: string; manufacturer: { name: string } } } } };
  const v = quote.batch.variant;
  const isDraft = quote.status === "draft";
  const live = ["submitted", "under_review", "approved", "published"].includes(quote.status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/dealer/requests">← Quotation requests</Link>}
        title={`${v.vehicle.manufacturer.name} ${v.vehicle.model_name} · ${v.name}`}
        description={<span className="flex flex-wrap items-center gap-2"><StatusBadge status={quote.status} />{quote.is_demo ? <DemoBadge /> : null}<span>{quote.batch.title} · {quote.batch.verified_participant_count} verified participants</span></span>}
        actions={
          <>
            {isDraft ? (
              <ActionButton action={submitQuotationAction.bind(null, quote.id)} confirm={{ title: "Submit for review?", description: "Save your latest changes first. After submission you can't edit line items unless GroupDrive requests changes." }}>
                Submit for review
              </ActionButton>
            ) : null}
            {isDraft || live ? (
              <ActionButton variant="ghost" action={withdrawQuotationAction.bind(null, quote.id)} reason={{ label: "Reason for withdrawing" }} confirm={{ title: "Withdraw this quotation?", destructive: true, confirmLabel: "Withdraw" }}>
                Withdraw
              </ActionButton>
            ) : null}
          </>
        }
      />
      {quote.review_notes && isDraft ? <Alert variant="warning" title="Changes requested by GroupDrive">{quote.review_notes}</Alert> : null}
      {quote.rejection_reason ? <Alert variant="danger" title="Rejected">{quote.rejection_reason}</Alert> : null}

      <Card>
        <CardHeader><CardTitle>{isDraft ? "Itemised quotation" : "Submitted quotation"}</CardTitle></CardHeader>
        <CardContent>
          {isDraft ? (
            <QuotationEditor
              quotationId={quote.id}
              defaults={{
                quoteReference: quote.quote_reference ?? "",
                validUntil: quote.valid_until ?? todayInIndia(),
                conditions: quote.conditions ?? "",
                availabilityNote: quote.availability_note ?? "",
                deliveryTimeline: quote.delivery_timeline ?? "",
                items: quote.line_items.length
                  ? [...quote.line_items].sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ category: i.category, label: i.label, amount: Number(i.amount), isIncluded: i.is_included, notes: i.notes ?? "" }))
                  : [
                      { category: "ex_showroom", label: "Ex-showroom price", amount: 0, isIncluded: true },
                      { category: "registration_road_tax", label: "Registration & road tax (RTO)", amount: 0, isIncluded: true },
                      { category: "insurance", label: "Insurance (1st year)", amount: 0, isIncluded: true },
                    ],
              }}
            />
          ) : (
            <QuotationBreakdown quote={quote} items={quote.line_items} showStatus />
          )}
        </CardContent>
      </Card>

      {live ? (
        <Card>
          <CardHeader><CardTitle>Keep availability current</CardTitle></CardHeader>
          <CardContent>
            <AvailabilityForm quotationId={quote.id} availabilityNote={quote.availability_note ?? ""} validUntil={quote.valid_until ?? todayInIndia()} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Quotation document</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {quote.document_path ? <FileLinkButton bucket="quotation-documents" path={quote.document_path} label="Open document" /> : <span className="text-sm text-muted-foreground">Attach your signed quotation (PDF/JPG/PNG, max 10 MB).</span>}
          {isDraft || ["submitted", "under_review", "approved"].includes(quote.status) ? <QuotationDocumentUpload quotationId={quote.id} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
