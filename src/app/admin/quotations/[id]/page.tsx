import Link from "next/link";
import { notFound } from "next/navigation";
import { QuotationDocumentUpload } from "@/components/quotes/document-upload";
import { FileLinkButton } from "@/components/quotes/file-link-button";
import { QuotationBreakdown } from "@/components/quotes/quotation-breakdown";
import { QuotationEditor } from "@/components/quotes/quotation-editor";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reviewQuotationAction, submitQuotationAsAdminAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { getCurrentPrice } from "@/lib/data/catalogue";
import { computeSavings } from "@/lib/domain/pricing";
import { formatDateTime, formatINR, todayInIndia } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AuditLog, Batch, DealerQuotation, QuotationLineItem } from "@/lib/types";

export default async function AdminQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("dealer_quotations")
    .select("*, dealer:dealers(name, is_demo), batch:batches(*), line_items:quotation_line_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const quote = data as DealerQuotation & { dealer: { name: string; is_demo: boolean }; batch: Batch; line_items: QuotationLineItem[] };
  const [{ data: audit }, reference] = await Promise.all([
    supabase.from("audit_logs").select("*").eq("entity_type", "dealer_quotation").eq("entity_id", id).order("created_at", { ascending: false }).limit(50),
    getCurrentPrice(quote.variant_id, quote.batch.city_id),
  ]);
  const editable = ["draft", "submitted", "under_review"].includes(quote.status);
  const today = todayInIndia();
  const preview = computeSavings(reference, { ...quote, city_id: quote.batch.city_id, status: "published", published_at: quote.published_at ?? new Date().toISOString(), items: quote.line_items }, today);
  const act = (action: string) => reviewQuotationAction.bind(null, quote.id, action);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/admin/quotations">← Quotations</Link>}
        title={`${quote.dealer.name} quotation`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={quote.status} /> {quote.is_demo ? <DemoBadge /> : null}
            <Link href={`/admin/batches/${quote.batch_id}`} className="text-primary hover:underline">{quote.batch.title}</Link>
          </span>
        }
      />

      <Card>
        <CardHeader><CardTitle>Review actions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {quote.status === "draft" ? (
              <ActionButton action={submitQuotationAsAdminAction.bind(null, quote.id)} confirm={{ title: "Record as submitted?", description: "Use this when you've entered a response the dealer sent by email." }}>
                Mark as submitted
              </ActionButton>
            ) : null}
            {quote.status === "submitted" ? <ActionButton variant="outline" action={act("start_review")}>Start review</ActionButton> : null}
            {["submitted", "under_review"].includes(quote.status) ? (
              <>
                <ActionButton action={act("approve")} reason={{ label: "Review notes (optional)", optional: true }} confirm={{ title: "Approve this quotation?", description: "Check every line item, validity and conditions against the dealer's document first." }}>
                  Approve
                </ActionButton>
                <ActionButton variant="outline" action={act("request_changes")} reason={{ label: "What should the dealer change?" }} confirm={{ title: "Return to dealer" }}>
                  Request changes
                </ActionButton>
              </>
            ) : null}
            {quote.status === "approved" ? (
              <ActionButton action={act("publish")} confirm={{ title: "Publish to verified participants?", description: "Participants will be notified and can contact this dealer." }}>
                Publish
              </ActionButton>
            ) : null}
            {["submitted", "under_review", "approved"].includes(quote.status) ? (
              <ActionButton variant="destructive" action={act("reject")} reason={{ label: "Rejection reason" }} confirm={{ title: "Reject quotation", destructive: true, confirmLabel: "Reject" }}>
                Reject
              </ActionButton>
            ) : null}
            {["approved", "published"].includes(quote.status) ? (
              <>
                <ActionButton variant="outline" action={act("expire")} reason={{ label: "Reason" }} confirm={{ title: "Mark expired" }}>Mark expired</ActionButton>
                <ActionButton variant="outline" action={act("withdraw")} reason={{ label: "Reason" }} confirm={{ title: "Mark withdrawn" }}>Mark withdrawn</ActionButton>
              </>
            ) : null}
          </div>
          {quote.review_notes ? <p className="text-sm text-muted-foreground">Latest notes: {quote.review_notes}</p> : null}
          {quote.rejection_reason ? <Alert variant="danger" title="Rejected">{quote.rejection_reason}</Alert> : null}
          <p className="text-xs text-muted-foreground">
            Savings preview: {preview.comparable ? `${formatINR(preview.saving)} (${preview.percent}%) below the reference of ${formatINR(preview.reference)}` : `not shown to customers — ${preview.reason}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{editable ? "Itemised quotation (editable until approval)" : "Itemised quotation"}</CardTitle></CardHeader>
        <CardContent>
          {editable ? (
            <QuotationEditor
              quotationId={quote.id}
              defaults={{
                quoteReference: quote.quote_reference ?? "",
                validUntil: quote.valid_until ?? "",
                conditions: quote.conditions ?? "",
                availabilityNote: quote.availability_note ?? "",
                deliveryTimeline: quote.delivery_timeline ?? "",
                items: quote.line_items.length
                  ? [...quote.line_items].sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ category: i.category, label: i.label, amount: Number(i.amount), isIncluded: i.is_included, notes: i.notes ?? "" }))
                  : [{ category: "ex_showroom", label: "Ex-showroom price", amount: 0, isIncluded: true }],
              }}
            />
          ) : (
            <QuotationBreakdown quote={quote} items={quote.line_items} showStatus />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dealer document</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {quote.document_path ? <FileLinkButton bucket="quotation-documents" path={quote.document_path} label="Open document" /> : <span className="text-sm text-muted-foreground">No document attached.</span>}
          <QuotationDocumentUpload quotationId={quote.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {((audit ?? []) as AuditLog[]).map((a) => (
              <li key={a.id} className="flex flex-wrap gap-2 border-b border-dashed pb-2">
                <span className="text-muted-foreground">{formatDateTime(a.created_at)}</span>
                <span className="font-medium">{a.action}</span>
                <span className="text-muted-foreground">by {a.actor_role ?? "system"} {a.actor_id ? <Link href={`/admin/users/${a.actor_id}`} className="text-primary">(user)</Link> : null}</span>
                {a.reason ? <span>— {a.reason}</span> : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
