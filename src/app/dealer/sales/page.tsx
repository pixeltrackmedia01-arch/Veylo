import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireDealer } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function DealerSalesPage() {
  await requireDealer();
  const supabase = await createClient();
  const { data } = await supabase.from("sale_verifications").select("*, enquiry:dealer_enquiries(customer_name)").order("created_at", { ascending: false });
  const rows = (data ?? []) as { id: string; status: string; sale_date: string; invoice_number: string | null; customer_confirmed_at: string | null; evidence_request_note: string | null; enquiry: { customer_name: string } }[];
  return (
    <div className="space-y-6">
      <PageHeader title="Sale claims" description="Claims you or customers submitted. Only GroupDrive can verify a sale; commission is recognised after verification." />
      <Table>
        <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Sale date</TableHead><TableHead>Invoice</TableHead><TableHead>Customer confirmed</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.enquiry.customer_name}</TableCell>
              <TableCell>{formatDate(s.sale_date)}</TableCell>
              <TableCell>{s.invoice_number ?? "—"}</TableCell>
              <TableCell>{s.customer_confirmed_at ? formatDate(s.customer_confirmed_at) : "Not yet"}</TableCell>
              <TableCell><StatusBadge status={s.status} />{s.status === "evidence_requested" && s.evidence_request_note ? <p className="text-xs text-muted-foreground">{s.evidence_request_note}</p> : null}</TableCell>
            </TableRow>
          ))}
          {!rows.length ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No sale claims yet.</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  );
}
