import Link from "next/link";
import { notFound } from "next/navigation";
import { DealerForm } from "@/components/admin/dealer-form";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { linkDealerUserAction, setDealerAuthorizationAction, unlinkDealerUserAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatINR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Dealer } from "@/lib/types";

export default async function AdminDealerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("dealers").select("*, brands:dealer_brands(manufacturer_id)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const dealer = data as Dealer & { brands: { manufacturer_id: string }[] };
  const [{ data: cities }, { data: manufacturers }, { data: notes }, { data: staff }, { data: quotes }, { data: commissions }] = await Promise.all([
    supabase.from("cities").select("id, name").order("name"),
    supabase.from("manufacturers").select("id, name").order("name"),
    supabase.from("dealer_admin_notes").select("notes").eq("dealer_id", id).maybeSingle(),
    supabase.from("dealer_users").select("id, user_id, job_title, is_active, created_at").eq("dealer_id", id),
    supabase.from("dealer_quotations").select("id, status, total_payable, submitted_at, batch:batches(title)").eq("dealer_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("commissions").select("final_amount, status").eq("dealer_id", id),
  ]);
  const { data: staffProfiles } = staff?.length ? await supabase.from("profiles").select("id, full_name, email").in("id", staff.map((s) => s.user_id)) : { data: [] };
  const owed = (commissions ?? []).filter((c) => ["pending", "invoiced", "payable"].includes(c.status)).reduce((s, c) => s + Number(c.final_amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/admin/dealers">← Dealers</Link>}
        title={dealer.name}
        description={<span className="flex items-center gap-2"><StatusBadge status={dealer.authorization_status} label={`Authorisation: ${dealer.authorization_status}`} />{dealer.is_demo ? <DemoBadge /> : null}{dealer.authorization_verified_at ? <span className="text-xs">verified {formatDate(dealer.authorization_verified_at)}</span> : null}</span>}
        actions={
          <>
            {dealer.authorization_status !== "verified" ? (
              <ActionButton action={setDealerAuthorizationAction.bind(null, dealer.id, "verified")} reason={{ label: "Which documents confirmed authorisation?" }} confirm={{ title: "Mark authorisation verified" }}>Verify authorisation</ActionButton>
            ) : (
              <ActionButton variant="destructive" action={setDealerAuthorizationAction.bind(null, dealer.id, "suspended")} reason={{ label: "Reason" }} confirm={{ title: "Suspend dealer authorisation", destructive: true, confirmLabel: "Suspend" }}>Suspend</ActionButton>
            )}
            {dealer.authorization_status === "pending" ? (
              <ActionButton variant="outline" action={setDealerAuthorizationAction.bind(null, dealer.id, "rejected")} reason={{ label: "Reason" }} confirm={{ title: "Reject authorisation" }}>Reject</ActionButton>
            ) : null}
          </>
        }
      />
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <DealerForm
            id={dealer.id}
            cities={cities ?? []}
            manufacturers={manufacturers ?? []}
            defaults={{
              name: dealer.name,
              slug: dealer.slug,
              branchAddress: dealer.branch_address,
              cityId: dealer.city_id,
              contactPerson: dealer.contact_person ?? "",
              businessEmail: dealer.business_email ?? "",
              businessPhone: dealer.business_phone ?? "",
              manufacturerIds: dealer.brands.map((b) => b.manufacturer_id),
              isActive: dealer.is_active,
              isDemo: dealer.is_demo,
              internalNotes: notes?.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Dealer portal users</CardTitle>
          <ActionButton size="sm" variant="outline" action={linkDealerUserAction.bind(null, dealer.id)} valueField={{ label: "Staff member's account email (they must sign up first)", type: "text", required: true }} reason={{ label: "Job title (optional)", optional: true }} confirm={{ title: "Grant dealer portal access", confirmLabel: "Grant access" }}>
            Add user
          </ActionButton>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {(staff ?? []).map((s) => {
              const p = staffProfiles?.find((x) => x.id === s.user_id);
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span><Link href={`/admin/users/${s.user_id}`} className="font-medium text-ink hover:text-primary">{p?.full_name ?? p?.email}</Link> <span className="text-muted-foreground">{s.job_title ?? ""} {s.is_active ? "" : "(removed)"}</span></span>
                  {s.is_active ? <ActionButton size="sm" variant="ghost" action={unlinkDealerUserAction.bind(null, s.id, dealer.id)} confirm={{ title: "Remove portal access?", destructive: true, confirmLabel: "Remove" }}>Remove</ActionButton> : null}
                </li>
              );
            })}
            {!staff?.length ? <li className="py-2 text-sm text-muted-foreground">No portal users yet.</li> : null}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Quotations & commissions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Outstanding commission: <strong className="text-ink">{formatINR(owed)}</strong> · <Link href={`/admin/commissions?dealer=${dealer.id}`} className="text-primary">view all</Link></p>
          <Table>
            <TableHeader><TableRow><TableHead>Batch</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader>
            <TableBody>
              {(quotes ?? []).map((q) => (
                <TableRow key={q.id}>
                  <TableCell><Link href={`/admin/quotations/${q.id}`} className="text-primary hover:underline">{(q.batch as unknown as { title: string })?.title}</Link></TableCell>
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                  <TableCell className="tabular-nums">{formatINR(q.total_payable)}</TableCell>
                  <TableCell>{formatDate(q.submitted_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
