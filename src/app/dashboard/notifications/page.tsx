import { Bell } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/shared/action-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "@/lib/actions/customer";
import { requireViewer } from "@/lib/auth/session";
import { getMyNotifications } from "@/lib/data/customer";
import { formatDateTime } from "@/lib/format";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const viewer = await requireViewer("/dashboard/notifications");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, pageCount } = await getMyNotifications(viewer.id, page);
  const unread = items.some((n) => !n.read_at);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        actions={unread ? <ActionButton variant="outline" size="sm" action={markNotificationsReadAction}>Mark all as read</ActionButton> : null}
      />
      {items.length ? (
        <ul className="divide-y rounded-2xl border bg-white">
          {items.map((n) => (
            <li key={n.id} className="flex gap-3 p-4">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} aria-label={n.read_at ? undefined : "Unread"} />
              <div className="min-w-0">
                <p className="font-semibold text-ink">{n.link_path ? <Link href={n.link_path} className="hover:underline">{n.subject}</Link> : n.subject}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Bell} title="No notifications yet" />
      )}
      {pageCount > 1 ? (
        <div className="flex justify-center gap-2">
          {page > 1 ? <Button asChild size="sm" variant="outline"><Link href={`?page=${page - 1}`}>Previous</Link></Button> : null}
          {page < pageCount ? <Button asChild size="sm" variant="outline"><Link href={`?page=${page + 1}`}>Next</Link></Button> : null}
        </div>
      ) : null}
    </div>
  );
}
