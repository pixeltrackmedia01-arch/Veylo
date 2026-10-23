import { CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { BatchStatusBadge, DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import type { MembershipWithBatch } from "@/lib/data/customer";
import { formatDate, timeRemaining } from "@/lib/format";

export function MembershipCard({ m, quoteCount }: { m: MembershipWithBatch; quoteCount: number }) {
  const b = m.batch;
  const v = b.variant.vehicle;
  return (
    <Link
      href={`/dashboard/groups/${b.id}`}
      className="group flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <BatchStatusBadge status={b.status} />
          {m.status !== "active" ? <StatusBadge status={m.status} /> : (
            <StatusBadge status={m.eligibility} label={m.eligibility === "verified" ? "You're verified" : m.eligibility === "pending_verification" ? "Verification pending" : "Ineligible"} />
          )}
          {quoteCount > 0 ? <StatusBadge status="published" label={`${quoteCount} quotation${quoteCount > 1 ? "s" : ""}`} /> : null}
          {b.is_demo ? <DemoBadge /> : null}
        </div>
        <p className="font-semibold text-ink">
          {v.manufacturer.name} {v.model_name} · {b.variant.name}
        </p>
        <div className="flex items-center gap-3">
          <Progress className="max-w-xs" size="sm" value={b.verified_participant_count} max={b.target_participants} label={`${b.title} progress`} />
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {b.verified_participant_count}/{b.target_participants}
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          {b.status === "open" ? `Closes ${formatDate(b.deadline)} · ${timeRemaining(b.deadline)}` : `Closed ${formatDate(b.closed_at ?? b.deadline)}`}
        </p>
      </div>
      <ChevronRight className="hidden size-5 text-muted-foreground group-hover:text-primary sm:block" aria-hidden="true" />
    </Link>
  );
}
