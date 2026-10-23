import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AuditLog } from "@/lib/types";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; entity?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const size = 50;
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
  if (sp.action) q = q.ilike("action", `${sp.action.replace(/[%_]/g, "")}%`);
  if (sp.entity) q = q.eq("entity_id", sp.entity);
  const { data, count } = await q;
  const rows = (data ?? []) as AuditLog[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));
  const qs = (p: number) => `?${new URLSearchParams({ ...(sp.action ? { action: sp.action } : {}), ...(sp.entity ? { entity: sp.entity } : {}), page: String(p) })}`;
  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Append-only record of sensitive actions, status changes, approvals, commission changes and overrides." />
      <form method="get" className="flex flex-wrap gap-2">
        <Input name="action" defaultValue={sp.action} placeholder="Action prefix, e.g. quotation." className="max-w-xs" aria-label="Action prefix" />
        <Input name="entity" defaultValue={sp.entity} placeholder="Entity id" className="max-w-xs" aria-label="Entity id" />
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <Table>
        <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Actor</TableHead><TableHead>Entity</TableHead><TableHead>Change</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(a.created_at)}</TableCell>
              <TableCell className="font-medium">{a.action}{a.reason ? <div className="text-xs font-normal text-muted-foreground">“{a.reason}”</div> : null}</TableCell>
              <TableCell className="text-xs">{a.actor_role}{a.actor_id ? <> · <Link href={`/admin/users/${a.actor_id}`} className="text-primary">user</Link></> : null}</TableCell>
              <TableCell className="text-xs">{a.entity_type}<div className="max-w-40 truncate text-muted-foreground">{a.entity_id}</div></TableCell>
              <TableCell className="max-w-xs text-xs"><code className="break-all text-muted-foreground">{a.before_data ? `${JSON.stringify(a.before_data)} → ` : ""}{a.after_data ? JSON.stringify(a.after_data).slice(0, 240) : ""}</code></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pages > 1 ? (
        <div className="flex justify-center gap-2 text-sm">
          {page > 1 ? <Button asChild size="sm" variant="outline"><Link href={qs(page - 1)}>Previous</Link></Button> : null}
          <span className="self-center">Page {page} of {pages}</span>
          {page < pages ? <Button asChild size="sm" variant="outline"><Link href={qs(page + 1)}>Next</Link></Button> : null}
        </div>
      ) : null}
    </div>
  );
}
