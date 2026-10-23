import { UsersRound } from "lucide-react";
import Link from "next/link";
import { MembershipCard } from "@/components/dashboard/membership-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/session";
import { getMyDashboardSummary, getMyMemberships } from "@/lib/data/customer";

export default async function MyGroupsPage() {
  const viewer = await requireViewer("/dashboard/groups");
  const [memberships, summary] = await Promise.all([getMyMemberships(viewer.id), getMyDashboardSummary(viewer.id)]);
  return (
    <div className="space-y-6">
      <PageHeader title="My groups" description="Every group you've joined, including closed and past groups." />
      {memberships.length ? (
        <div className="grid gap-3">
          {memberships.map((m) => (
            <MembershipCard key={m.id} m={m} quoteCount={summary.publishedQuotes.filter((q) => q.batch_id === m.batch.id).length} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UsersRound}
          title="No groups yet"
          action={
            <Button asChild>
              <Link href="/vehicles">Explore Group Deals</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
