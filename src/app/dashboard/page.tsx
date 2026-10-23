import { Bell, CircleCheck, CircleDashed, FileText, MessageSquare, UsersRound } from "lucide-react";
import Link from "next/link";
import { MembershipCard } from "@/components/dashboard/membership-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/session";
import { getMyDashboardSummary, getMyMemberships } from "@/lib/data/customer";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const viewer = await requireViewer("/dashboard");
  const sp = await searchParams;
  const [memberships, summary] = await Promise.all([getMyMemberships(viewer.id), getMyDashboardSummary(viewer.id)]);
  const profile = viewer.profile;
  const active = memberships.filter((m) => m.status === "active");
  const pendingIntents = summary.intents.filter((i) => i.status === "requested");
  const quoteCount = (batchId: string) => summary.publishedQuotes.filter((q) => q.batch_id === batchId).length;

  const checklist = [
    { done: Boolean(profile?.email_verified_at), label: "Email verified" },
    { done: Boolean(profile?.full_name), label: "Name added" },
    { done: Boolean(profile?.phone), label: "Mobile number added" },
    { done: Boolean(profile?.city_id), label: "City selected" },
  ];
  const incomplete = checklist.some((c) => !c.done);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="My dashboard"
        title={`Hello${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description="Track your groups, respond to requests and review published dealer quotations."
        actions={
          <Button asChild>
            <Link href="/vehicles">Find another group</Link>
          </Button>
        }
      />

      {sp.verified ? <Alert variant="success" title="Email verified">Your account is active. You can now join groups.</Alert> : null}
      {profile?.is_suspended ? (
        <Alert variant="danger" title="Account suspended">
          Your account is suspended and doesn&apos;t count toward any group. Please <Link href="/contact" className="font-semibold">contact us</Link>.
        </Alert>
      ) : null}

      {incomplete ? (
        <div className="rounded-2xl border bg-white p-5">
          <p className="font-semibold text-ink">Complete your verification to count toward group targets</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                {c.done ? <CircleCheck className="size-4 text-success" aria-hidden="true" /> : <CircleDashed className="size-4 text-warning" aria-hidden="true" />}
                <span className={c.done ? "text-muted-foreground" : "font-medium text-ink"}>{c.label}</span>
              </li>
            ))}
          </ul>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link href="/dashboard/profile">Update profile</Link>
          </Button>
        </div>
      ) : null}

      {pendingIntents.length ? (
        <Alert variant="warning" title="Please confirm your buying intent">
          {pendingIntents.length === 1 ? "One group is" : `${pendingIntents.length} groups are`} waiting for your answer.{" "}
          <Link href={`/dashboard/groups/${pendingIntents[0].batch_id}`} className="font-semibold text-primary">Respond now</Link>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active groups" value={active.length} icon={UsersRound} />
        <StatCard label="Published quotations" value={summary.publishedQuotes.length} icon={FileText} hint="Reviewed before publication" />
        <StatCard label="Dealer enquiries" value={summary.enquiries.length} icon={MessageSquare} />
      </div>

      <section aria-labelledby="my-groups">
        <h2 id="my-groups" className="text-xl font-bold">
          My groups
        </h2>
        {memberships.length ? (
          <div className="mt-4 grid gap-3">
            {memberships.slice(0, 6).map((m) => (
              <MembershipCard key={m.id} m={m} quoteCount={quoteCount(m.batch.id)} />
            ))}
            {memberships.length > 6 ? (
              <Link href="/dashboard/groups" className="text-sm font-semibold text-primary">
                View all {memberships.length} groups
              </Link>
            ) : null}
          </div>
        ) : (
          <EmptyState
            className="mt-4"
            icon={UsersRound}
            title="You haven't joined a group yet"
            description="Find the exact variant you plan to buy and join its group — it's free."
            action={
              <Button asChild>
                <Link href="/vehicles">Explore Group Deals</Link>
              </Button>
            }
          />
        )}
      </section>

      <section aria-labelledby="recent-notes">
        <div className="flex items-center justify-between">
          <h2 id="recent-notes" className="text-xl font-bold">
            Recent updates
          </h2>
          <Link href="/dashboard/notifications" className="text-sm font-semibold text-primary">
            All notifications
          </Link>
        </div>
        {summary.notifications.length ? (
          <ul className="mt-4 divide-y rounded-2xl border bg-white">
            {summary.notifications.map((n) => (
              <li key={n.id} className="flex gap-3 p-4">
                <Bell className={`mt-0.5 size-4 shrink-0 ${n.read_at ? "text-muted-foreground" : "text-primary"}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{n.link_path ? <Link href={n.link_path}>{n.subject}</Link> : n.subject}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No updates yet.</p>
        )}
      </section>
    </div>
  );
}
