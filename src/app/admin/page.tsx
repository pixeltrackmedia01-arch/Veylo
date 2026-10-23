import { Building2, CircleCheck, FileText, Handshake, IndianRupee, Inbox, Timer, UsersRound, Wallet } from "lucide-react";
import Link from "next/link";
import { ColumnChart, HorizontalBars, ParticipationChart } from "@/components/admin/charts";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runBatchProcessingAction } from "@/lib/actions/admin-catalogue";
import { dispatchEmailsNowAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { dateDaysAgo, formatINR, formatNumber, todayInIndia } from "@/lib/format";
import { getEmailProvider } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

type Metrics = Record<string, number>;
interface Series {
  participation: { date: string; joins: number; verified: number }[];
  funnel: { stage: string; value: number }[];
  categories: { category: string; participants: number }[];
  sales: { month: string; sales: number; commission: number }[];
}

function DataTable({ caption, rows }: { caption: string; rows: [string, string | number][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">View as table</summary>
      <table className="mt-2 w-full">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-dashed">
              <th scope="row" className="py-1.5 text-left font-normal text-muted-foreground">{k}</th>
              <td className="py-1.5 text-right tabular-nums">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = todayInIndia();
  const defaultFrom = dateDaysAgo(90);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : defaultFrom;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : today;
  const fromTs = `${from}T00:00:00+05:30`;
  const toTs = `${to}T23:59:59+05:30`;

  const supabase = await createClient();
  const [m, s] = await Promise.all([
    supabase.rpc("admin_dashboard_metrics", { p_from: fromTs, p_to: toTs }),
    supabase.rpc("admin_chart_series", { p_from: fromTs, p_to: toTs }),
  ]);
  const metrics = (m.data ?? {}) as Metrics;
  const series = (s.data ?? { participation: [], funnel: [], categories: [], sales: [] }) as Series;
  const provider = getEmailProvider();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Each count is distinct: registrations, verified participants, intent, enquiries, bookings and verified sales are never mixed."
        actions={
          <>
            <ActionButton variant="outline" size="sm" action={runBatchProcessingAction} confirm={{ title: "Run batch processing now?", description: "Closes due batches, requests quotations, sends reminders and expires old quotations. Safe to run repeatedly." }}>
              <Timer aria-hidden="true" /> Run batch job
            </ActionButton>
            <ActionButton variant="outline" size="sm" action={dispatchEmailsNowAction}>
              Send pending emails
            </ActionButton>
          </>
        }
      />

      {!provider.enabled ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Email delivery is disabled: no provider is configured (set EMAIL_PROVIDER, RESEND_API_KEY and EMAIL_FROM). Notifications
          are recorded in-app and email rows are marked “skipped” — nothing is reported as sent.
        </p>
      ) : null}

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4" method="get">
        <div className="grid gap-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={from} max={today} className="w-44" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={to} max={today} className="w-44" />
        </div>
        <Button type="submit" variant="outline">Apply</Button>
        <p className="text-xs text-muted-foreground">Date range applies to period counts and charts. Current-state counts (open, awaiting) ignore it.</p>
      </form>

      <section aria-labelledby="funnel-metrics" className="space-y-3">
        <h2 id="funnel-metrics" className="text-lg font-bold">Funnel (selected period)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Registered users" value={formatNumber(metrics.registered_users)} icon={UsersRound} />
          <StatCard label="Verified participants" value={formatNumber(metrics.verified_participants)} icon={CircleCheck} hint={`${formatNumber(metrics.unique_verified_participants)} unique people`} />
          <StatCard label="Confirmed purchase intent" value={formatNumber(metrics.intent_confirmed)} icon={Handshake} />
          <StatCard label="Dealer enquiries" value={formatNumber(metrics.dealer_enquiries)} icon={Inbox} />
          <StatCard label="Bookings" value={formatNumber(metrics.bookings)} icon={FileText} />
          <StatCard label="Verified completed sales" value={formatNumber(metrics.verified_sales)} icon={CircleCheck} hint={`${formatNumber(metrics.pending_sale_claims)} ${metrics.pending_sale_claims === 1 ? "claim" : "claims"} awaiting verification`} />
        </div>
      </section>

      <section aria-labelledby="ops-metrics" className="space-y-3">
        <h2 id="ops-metrics" className="text-lg font-bold">Operations & revenue</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Open batches" value={formatNumber(metrics.open_batches)} icon={UsersRound} />
          <StatCard label="Batches reaching target (period)" value={formatNumber(metrics.batches_target_reached)} icon={CircleCheck} />
          <StatCard label="Batches awaiting quotations" value={formatNumber(metrics.batches_awaiting_quotes)} icon={Timer} />
          <StatCard label="Approved quotations (period)" value={formatNumber(metrics.approved_quotations)} icon={FileText} />
          <StatCard label="Confirmed dealer commissions (period)" value={formatINR(metrics.confirmed_commissions)} icon={IndianRupee} />
          <StatCard label="Pending commission payments" value={formatINR(metrics.pending_commission_payments)} icon={Wallet} hint={`${formatINR(metrics.paid_commissions)} received in period`} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Verified joins per day</CardTitle>
          </CardHeader>
          <CardContent>
            {series.participation.length ? (
              <>
                <ParticipationChart data={series.participation.map((p) => ({ date: p.date.slice(5), verified: p.verified }))} />
                <DataTable caption="Verified joins per day" rows={series.participation.map((p) => [p.date, p.verified])} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No joins in this period.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Conversion funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars data={series.funnel.map((f) => ({ label: f.stage, value: f.value }))} valueLabel="Count" />
            <DataTable caption="Conversion funnel" rows={series.funnel.map((f) => [f.stage, f.value])} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verified participants by category</CardTitle>
          </CardHeader>
          <CardContent>
            <ColumnChart
              data={["car", "two_wheeler"].map((c) => ({ label: c === "car" ? "Cars" : "Two-wheelers", value: series.categories.find((x) => x.category === c)?.participants ?? 0 }))}
              valueLabel="Participants"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verified completed sales by month</CardTitle>
          </CardHeader>
          <CardContent>
            {series.sales.length ? (
              <>
                <ColumnChart data={series.sales.map((x) => ({ label: x.month, value: x.sales }))} valueLabel="Verified sales" />
                <DataTable caption="Verified sales and commission by month" rows={series.sales.map((x) => [x.month, `${x.sales} sales · ${formatINR(x.commission)}`])} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No verified sales in this period.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline"><Link href="/admin/batches?status=awaiting"><Building2 aria-hidden="true" /> Batches awaiting quotations</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/quotations?status=submitted">Quotations to review</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/sales?tab=claims">Sale claims to verify</Link></Button>
      </div>
    </div>
  );
}
