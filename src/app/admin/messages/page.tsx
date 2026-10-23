import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { setContactMessageStatusAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <div className="space-y-6">
      <PageHeader title="Contact messages" />
      <ul className="space-y-3">
        {(data ?? []).map((m) => (
          <li key={m.id} className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-ink">{m.subject}</p>
              <StatusBadge status={m.status === "closed" ? "inactive" : m.status === "new" ? "new" : "submitted"} label={m.status.replace("_", " ")} />
            </div>
            <p className="text-xs text-muted-foreground">{m.name} · <a href={`mailto:${m.email}`} className="text-primary">{m.email}</a>{m.phone ? ` · ${m.phone}` : ""} · {formatDateTime(m.created_at)}</p>
            <p className="mt-3 text-sm whitespace-pre-line">{m.message}</p>
            <div className="mt-3 flex gap-2">
              {m.status !== "in_progress" ? <ActionButton size="sm" variant="outline" action={setContactMessageStatusAction.bind(null, m.id, "in_progress")}>In progress</ActionButton> : null}
              {m.status !== "closed" ? <ActionButton size="sm" variant="ghost" action={setContactMessageStatusAction.bind(null, m.id, "closed")}>Close</ActionButton> : null}
            </div>
          </li>
        ))}
        {!data?.length ? <li className="text-sm text-muted-foreground">No messages.</li> : null}
      </ul>
    </div>
  );
}
