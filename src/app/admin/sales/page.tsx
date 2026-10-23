import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "claims", label: "Sale claims" },
  { key: "enquiries", label: "Enquiries" },
  { key: "bookings", label: "Bookings" },
];

export default async function AdminSalesPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "claims";
  const supabase = await createClient();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries, bookings & sales"
        description="A sale counts only after an admin verifies it with evidence. Dealers can claim sales but never verify them."
        actions={<Button asChild variant="outline"><a href={`/api/admin/export?type=${tab}`}>Export CSV</a></Button>}
      />
      <nav className="flex gap-2" aria-label="Sales sections">
        {TABS.map((t) => (
          <Link key={t.key} href={`?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined} className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold", tab === t.key && "border-ink bg-ink text-white")}>
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "claims" ? <Claims supabase={supabase} status={sp.status} /> : tab === "enquiries" ? <Enquiries supabase={supabase} /> : <Bookings supabase={supabase} />}
    </div>
  );
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function Claims({ supabase, status }: { supabase: Client; status?: string }) {
  let q = supabase.from("sale_verifications").select("*, dealer:dealers(name)").order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  const rows = (data ?? []) as { id: string; status: string; sale_date: string; claimed_by_role: string; invoice_number: string | null; customer_confirmed_at: string | null; created_at: string; dealer: { name: string } }[];
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Dealer</TableHead><TableHead>Status</TableHead><TableHead>Sale date</TableHead><TableHead>Claimed by</TableHead><TableHead>Customer confirmed</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell><Link href={`/admin/sales/${r.id}`} className="font-semibold text-ink hover:text-primary">{r.dealer.name}</Link><div className="text-xs text-muted-foreground">{r.invoice_number ?? "No invoice no."}</div></TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell>{formatDate(r.sale_date)}</TableCell>
            <TableCell>{r.claimed_by_role}</TableCell>
            <TableCell>{r.customer_confirmed_at ? formatDate(r.customer_confirmed_at) : "Not yet"}</TableCell>
          </TableRow>
        ))}
        {!rows.length ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No sale claims.</TableCell></TableRow> : null}
      </TableBody>
    </Table>
  );
}

async function Enquiries({ supabase }: { supabase: Client }) {
  const { data } = await supabase.from("dealer_enquiries").select("id, status, customer_name, created_at, dealer:dealers(name), batch:batches(title)").order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as unknown as { id: string; status: string; customer_name: string; created_at: string; dealer: { name: string }; batch: { title: string } }[];
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Dealer</TableHead><TableHead>Batch</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.customer_name}</TableCell>
            <TableCell>{r.dealer.name}</TableCell>
            <TableCell className="max-w-56 truncate text-sm">{r.batch.title}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
          </TableRow>
        ))}
        {!rows.length ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No enquiries.</TableCell></TableRow> : null}
      </TableBody>
    </Table>
  );
}

async function Bookings({ supabase }: { supabase: Client }) {
  const { data } = await supabase.from("bookings").select("id, status, booking_date, booking_reference, dealer:dealers(name)").order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as unknown as { id: string; status: string; booking_date: string; booking_reference: string | null; dealer: { name: string } }[];
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Dealer</TableHead><TableHead>Reference</TableHead><TableHead>Booked on</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.dealer.name}</TableCell>
            <TableCell>{r.booking_reference ?? "—"}</TableCell>
            <TableCell>{formatDate(r.booking_date)}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
          </TableRow>
        ))}
        {!rows.length ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No bookings.</TableCell></TableRow> : null}
      </TableBody>
    </Table>
  );
}
