import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BatchDetailsForm, DealerRequestPicker } from "@/components/admin/batch-forms";
import { RecordResponseButton } from "@/components/admin/record-response-button";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { BatchStatusBadge, DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  extendDeadlineAction,
  requestIntentAction,
  setMembershipEligibilityAction,
  transitionBatchAction,
} from "@/lib/actions/admin-catalogue";
import { requireAdmin } from "@/lib/auth/session";
import { closureOutcome, coordinationSummary } from "@/lib/domain/batch-lifecycle";
import { formatDateTime, formatINR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Batch, BatchMembership, Profile } from "@/lib/types";

export default async function AdminBatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ members?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("batches")
    .select("*, city:cities(name), variant:vehicle_variants(name, vehicle:vehicles(model_name, manufacturer_id, manufacturer:manufacturers(name)))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const batch = data as Batch & {
    city: { name: string };
    variant: { name: string; vehicle: { model_name: string; manufacturer_id: string; manufacturer: { name: string } } };
  };

  const memberFilter = sp.members ?? "active";
  let membersQuery = supabase.from("batch_memberships").select("*").eq("batch_id", id).order("joined_at").limit(200);
  if (memberFilter === "active") membersQuery = membersQuery.eq("status", "active");

  const [funnelRes, membersRes, requestsRes, quotesRes, extensionsRes, dealersRes] = await Promise.all([
    supabase.rpc("admin_batch_funnel", { p_batch_id: id }),
    membersQuery,
    supabase.from("quotation_requests").select("*, dealer:dealers(name, is_demo)").eq("batch_id", id).order("requested_at"),
    supabase.from("dealer_quotations").select("id, status, total_payable, dealer_id, valid_until, quotation_request_id").eq("batch_id", id),
    supabase.from("batch_deadline_extensions").select("*").eq("batch_id", id).order("created_at", { ascending: false }),
    supabase
      .from("dealers")
      .select("id, name, is_demo, dealer_brands!inner(manufacturer_id)")
      .eq("city_id", batch.city_id)
      .eq("is_active", true)
      .eq("authorization_status", "verified")
      .eq("dealer_brands.manufacturer_id", batch.variant.vehicle.manufacturer_id),
  ]);
  const funnel = (funnelRes.data ?? {}) as Record<string, number>;
  const members = (membersRes.data ?? []) as BatchMembership[];
  const { data: profiles } = members.length
    ? await supabase.from("profiles").select("id, full_name, email, phone, is_suspended").in("id", members.map((m) => m.user_id))
    : { data: [] };
  const profileOf = (uid: string) => (profiles as Pick<Profile, "id" | "full_name" | "email" | "phone" | "is_suspended">[] | null)?.find((p) => p.id === uid);
  const requests = (requestsRes.data ?? []) as { id: string; dealer_id: string; status: string; requested_at: string; dealer: { name: string; is_demo: boolean } }[];
  const quotes = (quotesRes.data ?? []) as { id: string; status: string; total_payable: string; quotation_request_id: string; valid_until: string | null }[];
  const eligibleDealers = ((dealersRes.data ?? []) as { id: string; name: string; is_demo: boolean }[]).map((d) => ({
    id: d.id,
    name: d.name,
    isDemo: d.is_demo,
    requested: requests.some((r) => r.dealer_id === d.id),
  }));
  const canRequestQuotes = ["target_reached", "closed_deadline", "quotation_requested", "quotation_review"].includes(batch.status);
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/admin/batches">← Batches</Link>}
        title={batch.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <BatchStatusBadge status={batch.status} /> {batch.is_demo ? <DemoBadge /> : null}
            <span>
              {batch.variant.vehicle.manufacturer.name} {batch.variant.vehicle.model_name} · {batch.variant.name} · {batch.city.name}
            </span>
          </span>
        }
        actions={
          batch.status !== "draft" ? (
            <Button asChild variant="ghost"><Link href={`/groups/${batch.slug}`} target="_blank">Public page <ExternalLink aria-hidden="true" /></Link></Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Verified participants" value={`${batch.verified_participant_count} / ${batch.target_participants}`} hint={<Progress size="sm" value={batch.verified_participant_count} max={batch.target_participants} label="Progress" />} />
        <StatCard label="Pending verification" value={funnel.pending_verification ?? 0} hint={`${funnel.withdrawn ?? 0} withdrawn · ${funnel.ineligible ?? 0} ineligible`} />
        <StatCard label="Intent confirmed" value={`${funnel.intent_confirmed ?? 0} / ${funnel.intent_requested ?? 0}`} hint="confirmed / requested" />
        <StatCard label="Enquiries · bookings · verified sales" value={`${funnel.enquiries ?? 0} · ${funnel.bookings ?? 0} · ${funnel.verified_sales ?? 0}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{coordinationSummary(batch.status)}</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Deadline</dt><dd className="font-medium">{formatDateTime(batch.deadline)} IST</dd></div>
            <div><dt className="text-muted-foreground">Minimum at deadline</dt><dd className="font-medium">{batch.minimum_participants}</dd></div>
            <div><dt className="text-muted-foreground">Closed</dt><dd className="font-medium">{batch.closed_at ? `${formatDateTime(batch.closed_at)} (${batch.close_reason})` : "—"}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            {batch.status === "draft" ? (
              <ActionButton action={transitionBatchAction.bind(null, batch.id, "open")} confirm={{ title: "Open this batch?", description: "It becomes public and customers can join for free." }}>
                Open batch
              </ActionButton>
            ) : null}
            {batch.status === "open" ? (
              <ActionButton
                variant="outline"
                action={transitionBatchAction.bind(null, batch.id, "closed_deadline")}
                confirm={{
                  title: "Close this batch now?",
                  description: `With ${batch.verified_participant_count} verified participants it will become “${closureOutcome(batch) === "expired" ? "expired" : "closed"}”${closureOutcome(batch) === "expired" ? " (below the minimum) and no quotations will be requested." : " and quotation requests will be sent to eligible dealers."}`,
                }}
                reason={{ label: "Reason for closing early", optional: true }}
              >
                Close now
              </ActionButton>
            ) : null}
            {["draft", "open"].includes(batch.status) ? (
              <ActionButton variant="outline" action={extendDeadlineAction.bind(null, batch.id)} valueField={{ label: "New deadline (IST)", type: "datetime-local", required: true }} reason={{ label: "Reason for extension" }} confirm={{ title: "Extend deadline", confirmLabel: "Extend" }}>
                Extend deadline
              </ActionButton>
            ) : null}
            {!["draft", "cancelled", "expired", "completed"].includes(batch.status) ? (
              <ActionButton variant="outline" action={requestIntentAction.bind(null, batch.id)} valueField={{ label: "Respond by (IST)", type: "datetime-local", hint: "Defaults to 5 days from now" }} confirm={{ title: "Request purchase-intent confirmation", description: "All verified participants are asked to reconfirm. Already-requested participants are not asked twice.", confirmLabel: "Send request" }}>
                Request intent confirmation
              </ActionButton>
            ) : null}
            {batch.status === "quotes_published" ? (
              <ActionButton variant="outline" action={transitionBatchAction.bind(null, batch.id, "purchase_in_progress")}>Mark purchases in progress</ActionButton>
            ) : null}
            {["quotes_published", "purchase_in_progress"].includes(batch.status) ? (
              <ActionButton variant="outline" action={transitionBatchAction.bind(null, batch.id, "completed")} confirm={{ title: "Mark batch completed?", description: "Completion only closes coordination for this batch; it does not mark any sale as verified." }}>
                Mark completed
              </ActionButton>
            ) : null}
            {!["cancelled", "expired", "completed"].includes(batch.status) ? (
              <ActionButton variant="destructive" action={transitionBatchAction.bind(null, batch.id, "cancelled")} reason={{ label: "Cancellation reason (shown to participants)" }} confirm={{ title: "Cancel this batch?", destructive: true, confirmLabel: "Cancel batch" }}>
                Cancel batch
              </ActionButton>
            ) : null}
          </div>
          {(extensionsRes.data ?? []).length ? (
            <div className="text-sm">
              <p className="font-semibold">Deadline extensions</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {(extensionsRes.data ?? []).map((e) => (
                  <li key={e.id}>
                    {formatDateTime(e.previous_deadline)} → {formatDateTime(e.new_deadline)} · {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dealer quotations</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {requests.length ? (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Dealer</TableHead><TableHead>Request</TableHead><TableHead>Quotation</TableHead><TableHead>Total</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const q = quotes.find((x) => x.quotation_request_id === r.id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.dealer.name}{r.dealer.is_demo ? <DemoBadge className="ml-2" /> : null}</TableCell>
                      <TableCell><StatusBadge status={r.status} /> <span className="text-xs text-muted-foreground">{formatDateTime(r.requested_at)}</span></TableCell>
                      <TableCell>{q ? <Link href={`/admin/quotations/${q.id}`} className="font-medium text-primary hover:underline"><StatusBadge status={q.status} /></Link> : r.status !== "cancelled" && r.status !== "declined" ? <RecordResponseButton requestId={r.id} /> : "—"}</TableCell>
                      <TableCell className="tabular-nums">{q ? formatINR(q.total_payable) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No quotation requests yet. They are created automatically when the batch closes.</p>
          )}
          {canRequestQuotes ? (
            <div className="rounded-xl border border-dashed p-4">
              <p className="mb-3 text-sm font-semibold text-ink">Request quotations from eligible dealers</p>
              <DealerRequestPicker batchId={batch.id} dealers={eligibleDealers} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Participants</CardTitle>
          <div className="flex gap-2 text-sm">
            <Link href="?members=active" aria-current={memberFilter === "active" ? "page" : undefined} className="rounded-full px-3 py-1 aria-[current=page]:bg-accent">Active</Link>
            <Link href="?members=all" aria-current={memberFilter === "all" ? "page" : undefined} className="rounded-full px-3 py-1 aria-[current=page]:bg-accent">All</Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Participant</TableHead><TableHead>Membership</TableHead><TableHead>Joined</TableHead><TableHead>Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const p = profileOf(m.user_id);
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link href={`/admin/users/${m.user_id}`} className="font-medium text-ink hover:text-primary">{p?.full_name ?? "—"}</Link>
                      <div className="text-xs text-muted-foreground">{p?.email} · {p?.phone ?? "no phone"}</div>
                    </TableCell>
                    <TableCell className="space-x-1">
                      <StatusBadge status={m.status} /> <StatusBadge status={m.eligibility} />
                      {m.ineligible_reason ? <div className="text-xs text-muted-foreground">{m.ineligible_reason}</div> : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.joined_at)}</TableCell>
                    <TableCell className="space-x-1">
                      {m.eligibility !== "ineligible" ? (
                        <ActionButton size="sm" variant="ghost" action={setMembershipEligibilityAction.bind(null, m.id, batch.id, "ineligible")} reason={{ label: "Why is this participant ineligible? (e.g. duplicate account, outside delivery area)" }} confirm={{ title: "Mark ineligible", description: "They will stop counting toward the target." }}>
                          Mark ineligible
                        </ActionButton>
                      ) : (
                        <ActionButton size="sm" variant="ghost" action={setMembershipEligibilityAction.bind(null, m.id, batch.id, "pending_verification")} reason={{ label: "Reason for reinstating" }} confirm={{ title: "Reinstate participant" }}>
                          Reinstate
                        </ActionButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!members.length ? <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No participants.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
          {members.length >= 200 ? <p className="mt-2 text-xs text-muted-foreground">Showing the first 200 participants.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Descriptive details</CardTitle></CardHeader>
        <CardContent>
          <BatchDetailsForm id={batch.id} title={batch.title} deliveryArea={batch.delivery_area} eligibilityRules={batch.eligibility_rules ?? ""} />
          <p className="mt-3 text-xs text-muted-foreground">
            Target, minimum, variant and city are fixed once a batch opens. Deadline changes go through “Extend deadline” and are audited.
            {batch.status === "open" && new Date(batch.deadline) < now ? " The deadline has passed — the scheduled job will close this batch on its next run." : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
