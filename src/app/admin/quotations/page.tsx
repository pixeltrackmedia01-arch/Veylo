import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const STATUSES = ["draft", "submitted", "under_review", "approved", "rejected", "published", "expired", "withdrawn"];

export default async function AdminQuotationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("dealer_quotations")
    .select("id, status, total_payable, valid_until, submitted_at, updated_at, is_demo, dealer:dealers(name), batch:batches(title)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (sp.status && STATUSES.includes(sp.status)) query = query.eq("status", sp.status);
  const { data } = await query;
  const rows = (data ?? []) as unknown as {
    id: string; status: string; total_payable: string; valid_until: string | null; submitted_at: string | null; updated_at: string; is_demo: boolean;
    dealer: { name: string }; batch: { title: string };
  }[];
  return (
    <div className="space-y-6">
      <PageHeader title="Quotations" description="Only approved and published quotations ever reach customers. Every action is recorded with who did it and when." />
      <form method="get" className="flex gap-2">
        <NativeSelect name="status" defaultValue={sp.status ?? ""} className="max-w-56" aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </NativeSelect>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Dealer</TableHead><TableHead>Batch</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Valid until</TableHead><TableHead>Updated</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((q) => (
            <TableRow key={q.id}>
              <TableCell><Link href={`/admin/quotations/${q.id}`} className="font-semibold text-ink hover:text-primary">{q.dealer?.name}</Link>{q.is_demo ? <DemoBadge className="ml-2" /> : null}</TableCell>
              <TableCell className="max-w-64 truncate text-sm">{q.batch?.title}</TableCell>
              <TableCell><StatusBadge status={q.status} /></TableCell>
              <TableCell className="tabular-nums">{formatINR(q.total_payable)}</TableCell>
              <TableCell>{formatDate(q.valid_until)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDateTime(q.updated_at)}</TableCell>
            </TableRow>
          ))}
          {!rows.length ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No quotations.</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  );
}
