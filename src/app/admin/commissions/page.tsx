import Link from "next/link";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adjustCommissionAction, updateCommissionAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { COMMISSION_TRANSITIONS } from "@/lib/domain/commission";
import { formatDate, formatINR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { toNumber, type Commission } from "@/lib/types";

const STATUSES = ["pending", "invoiced", "payable", "paid", "disputed", "cancelled"];

export default async function AdminCommissionsPage({ searchParams }: { searchParams: Promise<{ status?: string; dealer?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("commissions").select("*, dealer:dealers(name), batch:batches(title), agreement:commission_agreements(name)").order("created_at", { ascending: false }).limit(300);
  if (sp.status && STATUSES.includes(sp.status)) query = query.eq("status", sp.status);
  if (sp.dealer) query = query.eq("dealer_id", sp.dealer);
  const [{ data }, { data: dealers }] = await Promise.all([query, supabase.from("dealers").select("id, name").order("name")]);
  const rows = (data ?? []) as (Commission & { dealer: { name: string }; batch: { title: string }; agreement: { name: string } })[];
  const sum = (f: (c: Commission) => boolean) => rows.filter(f).reduce((s, c) => s + toNumber(c.final_amount), 0);
  const exportQs = new URLSearchParams({ type: "commissions", ...(sp.status ? { status: sp.status } : {}), ...(sp.dealer ? { dealer: sp.dealer } : {}) });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dealer commissions"
        description="Commissions exist only for verified completed sales and are calculated from the configured agreement — never from the vehicle price by default."
        actions={
          <>
            <Button asChild variant="outline"><Link href="/admin/commissions/agreements">Agreements</Link></Button>
            <Button asChild variant="outline"><a href={`/api/admin/export?${exportQs}`}>Export CSV</a></Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding (pending · invoiced · payable)" value={formatINR(sum((c) => ["pending", "invoiced", "payable"].includes(c.status)))} />
        <StatCard label="Disputed" value={formatINR(sum((c) => c.status === "disputed"))} />
        <StatCard label="Received" value={formatINR(sum((c) => c.status === "paid"))} />
      </div>
      <form method="get" className="flex flex-wrap gap-2">
        <NativeSelect name="status" defaultValue={sp.status ?? ""} className="max-w-48" aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </NativeSelect>
        <NativeSelect name="dealer" defaultValue={sp.dealer ?? ""} className="max-w-64" aria-label="Dealer">
          <option value="">All dealers</option>
          {(dealers ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </NativeSelect>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Dealer / sale</TableHead><TableHead>Rule</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => {
            const next = COMMISSION_TRANSITIONS[c.status] ?? [];
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <p className="font-semibold text-ink">{c.dealer.name}</p>
                  <p className="text-xs text-muted-foreground">{c.batch.title} · sale ref {c.sale_reference ?? "—"} · verified {formatDate(c.verified_completion_date)}</p>
                  <Link href={`/admin/sales/${c.sale_verification_id}`} className="text-xs text-primary">Sale record</Link>
                </TableCell>
                <TableCell className="text-xs">
                  {c.agreement.name}
                  <div className="text-muted-foreground">{c.calc_type === "fixed" ? `Fixed ${formatINR(c.fixed_amount)}` : `${c.rate_percentage}% of ${formatINR(c.basis_amount)} (${c.basis_label})`}</div>
                </TableCell>
                <TableCell className="tabular-nums">
                  <p className="font-semibold">{formatINR(c.final_amount)}</p>
                  {toNumber(c.adjustment_amount) !== 0 ? <p className="text-xs text-muted-foreground">calc {formatINR(c.calculated_amount)} · adj {formatINR(c.adjustment_amount)}</p> : null}
                  {c.invoice_reference ? <p className="text-xs text-muted-foreground">Inv {c.invoice_reference}</p> : null}
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                  {c.payment_date ? <p className="text-xs text-muted-foreground">paid {formatDate(c.payment_date)}</p> : null}
                  {c.dispute_status !== "none" ? <p className="text-xs text-muted-foreground">dispute {c.dispute_status}</p> : null}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {next.includes("invoiced") ? (
                      <ActionButton size="sm" variant="outline" action={updateCommissionAction.bind(null, c.id, "invoiced")} valueField={{ label: "Invoice reference", required: true }} confirm={{ title: "Mark invoiced" }}>Invoiced</ActionButton>
                    ) : null}
                    {next.includes("payable") ? <ActionButton size="sm" variant="outline" action={updateCommissionAction.bind(null, c.id, "payable")}>Payable</ActionButton> : null}
                    {next.includes("paid") ? (
                      <ActionButton size="sm" action={updateCommissionAction.bind(null, c.id, "paid")} valueField={{ label: "Payment received on", type: "date", required: true }} reason={{ label: "Payment reference (UTR / cheque no.)" }} confirm={{ title: "Mark payment received", description: "Only record a payment you have confirmed in the bank statement." }}>Paid</ActionButton>
                    ) : null}
                    {next.includes("disputed") ? (
                      <ActionButton size="sm" variant="ghost" action={updateCommissionAction.bind(null, c.id, "disputed")} reason={{ label: "Dispute details" }} confirm={{ title: "Open a dispute" }}>Dispute</ActionButton>
                    ) : null}
                    {c.status === "disputed" ? (
                      <ActionButton size="sm" variant="ghost" action={updateCommissionAction.bind(null, c.id, "pending")} reason={{ label: "Resolution" }} confirm={{ title: "Resolve dispute" }}>Resolve</ActionButton>
                    ) : null}
                    {!["paid", "cancelled"].includes(c.status) ? (
                      <>
                        <ActionButton size="sm" variant="ghost" action={adjustCommissionAction.bind(null, c.id)} valueField={{ label: "Adjustment (₹, negative to reduce)", type: "number", required: true }} reason={{ label: "Reason for manual adjustment" }} confirm={{ title: "Manual adjustment" }}>Adjust</ActionButton>
                        <ActionButton size="sm" variant="ghost" action={updateCommissionAction.bind(null, c.id, "cancelled")} reason={{ label: "Cancellation reason" }} confirm={{ title: "Cancel commission", destructive: true, confirmLabel: "Cancel commission" }}>Cancel</ActionButton>
                      </>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {!rows.length ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No commissions yet. They are created when sales are verified.</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  );
}
