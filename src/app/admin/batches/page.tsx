import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { BatchStatusBadge, DemoBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { BATCH_STATUS_LABELS } from "@/lib/domain/batch-lifecycle";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { BatchStatus } from "@/lib/types";

const AWAITING: BatchStatus[] = ["target_reached", "closed_deadline", "quotation_requested", "quotation_review"];

export default async function AdminBatchesPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const size = 50;
  const supabase = await createClient();
  let query = supabase
    .from("batches")
    .select("id, title, slug, status, deadline, verified_participant_count, target_participants, is_demo, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (sp.status === "awaiting") query = query.in("status", AWAITING);
  else if (sp.status) query = query.eq("status", sp.status);
  const { data: batches, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        description="Each batch is for one exact variant. Counts include verified participants only and are maintained by the database."
        actions={<Button asChild><Link href="/admin/batches/new"><Plus aria-hidden="true" /> New batch</Link></Button>}
      />
      <form method="get" className="flex gap-2">
        <NativeSelect name="status" defaultValue={sp.status ?? ""} className="max-w-64" aria-label="Status">
          <option value="">All statuses</option>
          <option value="awaiting">Awaiting quotations</option>
          {Object.entries(BATCH_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </NativeSelect>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Deadline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(batches ?? []).map((b) => (
            <TableRow key={b.id}>
              <TableCell className="max-w-md">
                <Link href={`/admin/batches/${b.id}`} className="font-semibold text-ink hover:text-primary">{b.title}</Link>
                {b.is_demo ? <DemoBadge className="ml-2" /> : null}
              </TableCell>
              <TableCell><BatchStatusBadge status={b.status as BatchStatus} /></TableCell>
              <TableCell className="min-w-40">
                <span className="text-sm tabular-nums">{b.verified_participant_count}/{b.target_participants}</span>
                <Progress size="sm" value={b.verified_participant_count} max={b.target_participants} label="Progress" />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(b.deadline)}</TableCell>
            </TableRow>
          ))}
          {!batches?.length ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No batches.</TableCell></TableRow> : null}
        </TableBody>
      </Table>
      {pages > 1 ? (
        <div className="flex justify-center gap-2 text-sm">
          {page > 1 ? <Button asChild size="sm" variant="outline"><Link href={`?status=${sp.status ?? ""}&page=${page - 1}`}>Previous</Link></Button> : null}
          <span className="self-center">Page {page} of {pages}</span>
          {page < pages ? <Button asChild size="sm" variant="outline"><Link href={`?status=${sp.status ?? ""}&page=${page + 1}`}>Next</Link></Button> : null}
        </div>
      ) : null}
    </div>
  );
}
