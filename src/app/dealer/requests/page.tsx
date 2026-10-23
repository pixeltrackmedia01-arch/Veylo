import Link from "next/link";
import { StartQuotationButton } from "@/components/dealer/dealer-actions";
import { ActionButton } from "@/components/shared/action-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { declineRequestAction } from "@/lib/actions/dealer";
import { requireDealer } from "@/lib/auth/session";
import { formatDate, formatINR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { FileText } from "lucide-react";

export default async function DealerRequestsPage() {
  await requireDealer();
  const supabase = await createClient();
  const [{ data: requests }, { data: quotes }] = await Promise.all([
    supabase
      .from("quotation_requests")
      .select("*, batch:batches(title, is_demo, delivery_area, verified_participant_count, variant:vehicle_variants(name, vehicle:vehicles(model_name, manufacturer:manufacturers(name))))")
      .order("requested_at", { ascending: false }),
    supabase.from("dealer_quotations").select("id, quotation_request_id, status, total_payable"),
  ]);
  type Row = { id: string; status: string; requested_at: string; response_due_at: string | null; participant_count_snapshot: number; batch: { title: string; is_demo: boolean; delivery_area: string; variant: { name: string; vehicle: { model_name: string; manufacturer: { name: string } } } } };
  const rows = (requests ?? []) as Row[];
  return (
    <div className="space-y-6">
      <PageHeader title="Quotation requests" description="Groups of verified buyers waiting for your itemised quotation. You only see requests sent to your dealership." />
      {rows.length ? (
        <Table>
          <TableHeader><TableRow><TableHead>Group</TableHead><TableHead>Participants</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => {
              const q = (quotes ?? []).find((x) => x.quotation_request_id === r.id);
              const v = r.batch.variant;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-semibold text-ink">{v.vehicle.manufacturer.name} {v.vehicle.model_name} · {v.name}</p>
                    <p className="text-xs text-muted-foreground">{r.batch.title} · {r.batch.delivery_area}</p>
                    {r.batch.is_demo ? <DemoBadge className="mt-1" /> : null}
                  </TableCell>
                  <TableCell>{r.participant_count_snapshot} verified</TableCell>
                  <TableCell>{formatDate(r.response_due_at)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                    {q ? <div className="mt-1"><StatusBadge status={q.status} label={`Quote ${q.status.replace("_", " ")}`} /></div> : null}
                  </TableCell>
                  <TableCell className="space-y-1">
                    {q ? (
                      <Link href={`/dealer/quotations/${q.id}`} className="text-sm font-semibold text-primary hover:underline">Open quotation ({formatINR(q.total_payable)})</Link>
                    ) : ["pending", "sent"].includes(r.status) ? (
                      <div className="flex flex-wrap gap-1">
                        <StartQuotationButton requestId={r.id} />
                        <ActionButton size="sm" variant="ghost" action={declineRequestAction.bind(null, r.id)} reason={{ label: "Why are you declining? (e.g. no stock)" }} confirm={{ title: "Decline this request?" }}>Decline</ActionButton>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState icon={FileText} title="No quotation requests yet" description="When a buyer group for a brand you're authorised for closes in your city, the request appears here." />
      )}
    </div>
  );
}
