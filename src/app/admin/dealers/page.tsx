import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDealersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: dealers }, { data: requests }] = await Promise.all([
    supabase.from("dealers").select("id, name, authorization_status, is_active, is_demo, city:cities(name), brands:dealer_brands(manufacturer:manufacturers(name))").order("name"),
    supabase.from("quotation_requests").select("dealer_id, status"),
  ]);
  const perf = (id: string) => {
    const rs = (requests ?? []).filter((r) => r.dealer_id === id);
    return { total: rs.length, responded: rs.filter((r) => r.status === "responded").length, declined: rs.filter((r) => r.status === "declined").length };
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Dealers" description="Only active dealers with verified authorisation for the brand receive quotation requests." actions={<Button asChild><Link href="/admin/dealers/new"><Plus aria-hidden="true" /> Add dealer</Link></Button>} />
      <Table>
        <TableHeader><TableRow><TableHead>Dealer</TableHead><TableHead>Brands</TableHead><TableHead>Authorisation</TableHead><TableHead>Requests · responded · declined</TableHead></TableRow></TableHeader>
        <TableBody>
          {(dealers ?? []).map((d) => {
            const p = perf(d.id);
            return (
              <TableRow key={d.id}>
                <TableCell>
                  <Link href={`/admin/dealers/${d.id}`} className="font-semibold text-ink hover:text-primary">{d.name}</Link>
                  {d.is_demo ? <DemoBadge className="ml-2" /> : null}
                  <div className="text-xs text-muted-foreground">{(d.city as unknown as { name: string })?.name}{d.is_active ? "" : " · inactive"}</div>
                </TableCell>
                <TableCell className="text-xs">{(d.brands as unknown as { manufacturer: { name: string } }[]).map((b) => b.manufacturer.name).join(", ") || "—"}</TableCell>
                <TableCell><StatusBadge status={d.authorization_status} /></TableCell>
                <TableCell className="tabular-nums">{p.total} · {p.responded} · {p.declined}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
