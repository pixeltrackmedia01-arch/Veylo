import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { BATCH_STATUS_LABELS, BATCH_STATUS_TONE, type StatusTone } from "@/lib/domain/batch-lifecycle";
import type { BatchStatus } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const TONE_TO_VARIANT: Record<StatusTone, BadgeVariant> = {
  neutral: "neutral",
  success: "success",
  info: "info",
  warning: "warning",
  danger: "danger",
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <Badge variant={TONE_TO_VARIANT[BATCH_STATUS_TONE[status]]}>{BATCH_STATUS_LABELS[status]}</Badge>;
}

const GENERIC_TONES: Record<string, BadgeVariant> = {
  // positive
  verified: "success",
  published: "success",
  approved: "success",
  confirmed: "success",
  paid: "success",
  active: "success",
  booked: "success",
  delivered: "success",
  responded: "success",
  sent: "success",
  // in progress
  submitted: "info",
  under_review: "info",
  invoiced: "info",
  payable: "info",
  contacted: "info",
  test_drive_scheduled: "info",
  negotiating: "info",
  claimed: "info",
  requested: "info",
  pending: "warning",
  pending_verification: "warning",
  evidence_requested: "warning",
  draft: "neutral",
  new: "brand",
  // negative
  rejected: "danger",
  cancelled: "danger",
  disputed: "danger",
  ineligible: "danger",
  suspended: "danger",
  declined: "neutral",
  withdrawn: "neutral",
  expired: "neutral",
  closed_lost: "neutral",
  inactive: "neutral",
  failed: "danger",
  skipped: "neutral",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge variant={GENERIC_TONES[status] ?? "neutral"}>{label ?? titleCase(status)}</Badge>;
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="demo" className={className} title="Illustrative demo data — not real">
      Demo data
    </Badge>
  );
}
