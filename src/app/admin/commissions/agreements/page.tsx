import Link from "next/link";
import { AgreementForm } from "@/components/admin/agreement-form";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setAgreementStatusAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatINR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { CommissionAgreement } from "@/lib/types";

export default async function AgreementsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: agreements }, { data: dealers }, { data: manufacturers }, { data: vehicles }, { data: batches }] = await Promise.all([
    supabase.from("commission_agreements").select("*, dealer:dealers(name), manufacturer:manufacturers(name), vehicle:vehicles(model_name), batch:batches(title)").order("created_at", { ascending: false }),
    supabase.from("dealers").select("id, name").order("name"),
    supabase.from("manufacturers").select("id, name").order("name"),
    supabase.from("vehicles").select("id, model_name").order("model_name"),
    supabase.from("batches").select("id, title").order("created_at", { ascending: false }).limit(100),
  ]);
  type Row = CommissionAgreement & { dealer: { name: string } | null; manufacturer: { name: string } | null; vehicle: { model_name: string } | null; batch: { title: string } | null };
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/admin/commissions">← Commissions</Link>}
        title="Commission agreements"
        description="The most specific active agreement applies: dealer-specific beats general; then campaign > variant > model > manufacturer. Percentages always state their basis."
      />
      <Table>
        <TableHeader><TableRow><TableHead>Agreement</TableHead><TableHead>Scope</TableHead><TableHead>Terms</TableHead><TableHead>Effective</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {((agreements ?? []) as Row[]).map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-semibold">{a.name}<div className="text-xs font-normal text-muted-foreground">{a.notes}</div></TableCell>
              <TableCell className="text-xs">{[a.dealer?.name, a.manufacturer?.name, a.vehicle?.model_name, a.batch?.title].filter(Boolean).join(" · ") || "All sales"}</TableCell>
              <TableCell className="text-xs">
                {a.calc_type === "fixed" ? `${formatINR(a.fixed_amount)} per verified sale` : `${a.percentage}% of ${a.basis_label}`}
                {a.cap_amount ? ` · cap ${formatINR(a.cap_amount)}` : ""}
              </TableCell>
              <TableCell className="text-xs">{formatDate(a.effective_from)} – {a.effective_to ? formatDate(a.effective_to) : "open"}</TableCell>
              <TableCell>
                <StatusBadge status={a.status} />
                <div className="mt-1">
                  {a.status !== "active" ? (
                    <ActionButton size="sm" variant="link" action={setAgreementStatusAction.bind(null, a.id, "active")}>Activate</ActionButton>
                  ) : (
                    <ActionButton size="sm" variant="link" action={setAgreementStatusAction.bind(null, a.id, "inactive")} confirm={{ title: "Deactivate agreement?", description: "Existing commissions keep the terms they were calculated with." }}>Deactivate</ActionButton>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Card>
        <CardHeader><CardTitle>New agreement</CardTitle></CardHeader>
        <CardContent>
          <AgreementForm
            dealers={dealers ?? []}
            manufacturers={manufacturers ?? []}
            vehicles={(vehicles ?? []).map((v) => ({ id: v.id, name: v.model_name }))}
            batches={(batches ?? []).map((b) => ({ id: b.id, name: b.title }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
