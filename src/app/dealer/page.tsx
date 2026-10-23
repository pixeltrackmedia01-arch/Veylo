import { FileText, Handshake, IndianRupee, Inbox } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { requireDealer } from "@/lib/auth/session";
import { formatINR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function DealerOverview() {
  const viewer = await requireDealer();
  const supabase = await createClient();
  // RLS limits every query to the dealer's own records.
  const [{ data: dealers }, { data: requests }, { data: enquiries }, { data: claims }, { data: commissions }] = await Promise.all([
    supabase.from("dealers").select("id, name, authorization_status, is_demo").in("id", viewer.dealerIds),
    supabase.from("quotation_requests").select("id, status"),
    supabase.from("dealer_enquiries").select("id, status"),
    supabase.from("sale_verifications").select("id, status"),
    supabase.from("commissions").select("final_amount, status"),
  ]);
  const outstanding = (commissions ?? []).filter((c) => ["pending", "invoiced", "payable"].includes(c.status)).reduce((s, c) => s + Number(c.final_amount), 0);
  return (
    <div className="space-y-6">
      <PageHeader
        title={dealers?.map((d) => d.name).join(", ") ?? "Dealer portal"}
        description="Respond to group quotation requests, manage enquiries routed to you, and report completed sales."
        eyebrow={<span className="flex items-center gap-2">{dealers?.map((d) => <StatusBadge key={d.id} status={d.authorization_status} label={`Authorisation ${d.authorization_status}`} />)}{dealers?.some((d) => d.is_demo) ? <DemoBadge /> : null}</span>}
      />
      <Alert variant="info">
        Quotations you submit are reviewed by GroupDrive before participants see them. Customers buy directly from you; please confirm final
        on-road price, offers, stock, financing, insurance, registration and delivery with them directly.
      </Alert>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dealer/requests"><StatCard label="Open quotation requests" value={(requests ?? []).filter((r) => ["pending", "sent"].includes(r.status)).length} icon={FileText} /></Link>
        <Link href="/dealer/enquiries"><StatCard label="New enquiries" value={(enquiries ?? []).filter((e) => e.status === "new").length} icon={Inbox} /></Link>
        <Link href="/dealer/sales"><StatCard label="Sale claims in review" value={(claims ?? []).filter((c) => !["verified", "rejected"].includes(c.status)).length} icon={Handshake} /></Link>
        <Link href="/dealer/commissions"><StatCard label="Commission outstanding" value={formatINR(outstanding)} icon={IndianRupee} /></Link>
      </div>
    </div>
  );
}
