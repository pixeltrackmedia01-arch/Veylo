import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireDealer } from "@/lib/auth/session";
import { formatDate, formatINR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Commission, CommissionAgreement } from "@/lib/types";

export default async function DealerCommissionsPage() {
  await requireDealer();
  const supabase = await createClient();
  const [{ data: commissions }, { data: agreements }] = await Promise.all([
    supabase.from("commissions").select("*, batch:batches(title)").order("created_at", { ascending: false }),
    supabase.from("commission_agreements").select("*"),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Commissions" description="Read-only. Commission is payable only on verified completed sales, under your agreement with GroupDrive. Payment status is updated by GroupDrive when funds are received." />
      <Card>
        <CardHeader><CardTitle>Your agreements</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {((agreements ?? []) as CommissionAgreement[]).map((a) => (
              <li key={a.id}>
                <strong>{a.name}</strong>: {a.calc_type === "fixed" ? `${formatINR(a.fixed_amount)} per verified sale` : `${a.percentage}% of ${a.basis_label}`}
                {a.cap_amount ? `, capped at ${formatINR(a.cap_amount)}` : ""} · from {formatDate(a.effective_from)}{a.effective_to ? ` to ${formatDate(a.effective_to)}` : ""}
              </li>
            ))}
            {!agreements?.length ? <li className="text-muted-foreground">No dealer-specific agreement on file. Contact GroupDrive.</li> : null}
          </ul>
        </CardContent>
      </Card>
      <Table>
        <TableHeader><TableRow><TableHead>Batch / sale</TableHead><TableHead>Verified</TableHead><TableHead>Amount</TableHead><TableHead>Invoice</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {((commissions ?? []) as (Commission & { batch: { title: string } })[]).map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.batch.title}<div className="text-xs text-muted-foreground">ref {c.sale_reference ?? "—"}</div></TableCell>
              <TableCell>{formatDate(c.verified_completion_date)}</TableCell>
              <TableCell className="tabular-nums">{formatINR(c.final_amount)}</TableCell>
              <TableCell>{c.invoice_reference ?? "—"}</TableCell>
              <TableCell><StatusBadge status={c.status} />{c.payment_date ? <div className="text-xs text-muted-foreground">received {formatDate(c.payment_date)}</div> : null}</TableCell>
            </TableRow>
          ))}
          {!commissions?.length ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No commissions yet.</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  );
}
