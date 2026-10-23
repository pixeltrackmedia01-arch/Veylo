import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { BatchStatusBadge, StatusBadge } from "@/components/shared/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markPhoneVerifiedAction, setRoleAction, setSuspensionAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { BatchStatus, Profile } from "@/lib/types";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*, city:cities(name)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const user = data as Profile & { city: { name: string } | null };
  const [{ data: roles }, { data: memberships }, { data: enquiries }, { data: dealerLinks }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", id),
    supabase.from("batch_memberships").select("id, status, eligibility, joined_at, batch:batches(id, title, status)").eq("user_id", id).order("joined_at", { ascending: false }),
    supabase.from("dealer_enquiries").select("id, status, created_at, dealer:dealers(name)").eq("user_id", id),
    supabase.from("dealer_users").select("dealer_id, is_active, dealer:dealers(name)").eq("user_id", id),
  ]);
  const roleList = (roles ?? []).map((r) => r.role as string);
  const self = id === viewer.id;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/admin/users">← Users</Link>}
        title={user.full_name ?? user.email ?? "User"}
        description={`${user.email ?? ""} · ${user.phone ?? "no phone"} · ${user.city?.name ?? "no city"} · joined ${formatDate(user.created_at)}`}
        actions={
          !self ? (
            user.is_suspended ? (
              <ActionButton variant="outline" action={setSuspensionAction.bind(null, user.id, false)} reason={{ label: "Reason for reinstating" }} confirm={{ title: "Reinstate account" }}>Reinstate</ActionButton>
            ) : (
              <ActionButton variant="destructive" action={setSuspensionAction.bind(null, user.id, true)} reason={{ label: "Justification for suspension" }} confirm={{ title: "Suspend account?", description: "The user stops counting toward any group and loses dealer/admin access.", destructive: true, confirmLabel: "Suspend" }}>Suspend</ActionButton>
            )
          ) : null
        }
      />
      {user.is_suspended ? <Alert variant="danger" title="Suspended">{user.suspended_reason}</Alert> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Verification</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Email: {user.email_verified_at ? `verified ${formatDateTime(user.email_verified_at)}` : "not verified"}</p>
            <p>Mobile: {user.phone_verified_at ? `verified ${formatDateTime(user.phone_verified_at)}` : "not verified"}</p>
            <p>Preferences: {user.preferred_category ?? "—"} · {user.purchase_timeline?.replace(/_/g, " ") ?? "—"}</p>
            {!user.phone_verified_at && user.phone ? (
              <ActionButton size="sm" variant="outline" action={markPhoneVerifiedAction.bind(null, user.id)} reason={{ label: "How was the number verified? (e.g. call-back on date)" }} confirm={{ title: "Mark mobile verified manually" }}>
                Mark mobile verified
              </ActionButton>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Roles</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">{roleList.map((r) => <StatusBadge key={r} status="active" label={r} />)}</div>
            <div className="flex flex-wrap gap-2">
              {!roleList.includes("admin") ? (
                <ActionButton size="sm" variant="outline" action={setRoleAction.bind(null, user.id, "admin", true)} confirm={{ title: "Grant admin access?", description: "Admins can approve quotations, verify sales and manage commissions." }}>Make admin</ActionButton>
              ) : !self ? (
                <ActionButton size="sm" variant="outline" action={setRoleAction.bind(null, user.id, "admin", false)} confirm={{ title: "Remove admin access?" }}>Remove admin</ActionButton>
              ) : null}
            </div>
            {dealerLinks?.length ? (
              <p className="text-muted-foreground">Dealer portal: {dealerLinks.map((d) => `${(d.dealer as unknown as { name: string }).name}${d.is_active ? "" : " (removed)"}`).join(", ")}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Batch memberships</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(memberships ?? []).map((m) => {
              const b = m.batch as unknown as { id: string; title: string; status: BatchStatus };
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Link href={`/admin/batches/${b.id}`} className="font-medium text-ink hover:text-primary">{b.title}</Link>
                  <BatchStatusBadge status={b.status} /> <StatusBadge status={m.status} /> <StatusBadge status={m.eligibility} />
                  <span className="text-xs text-muted-foreground">{formatDate(m.joined_at)}</span>
                </li>
              );
            })}
            {!memberships?.length ? <li className="py-2 text-muted-foreground">No memberships.</li> : null}
          </ul>
          {enquiries?.length ? <p className="mt-3 text-sm text-muted-foreground">Enquiries: {enquiries.map((e) => `${(e.dealer as unknown as { name: string }).name} (${e.status})`).join(", ")}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
