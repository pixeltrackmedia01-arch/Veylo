import type { Batch, BatchStatus } from "@/lib/types";

/**
 * Batch state machine. Mirrors public.batch_transition_allowed() in the
 * database, which is the source of truth; this copy drives the UI.
 */
export const BATCH_TRANSITIONS: Record<BatchStatus, readonly BatchStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["target_reached", "closed_deadline", "expired", "cancelled"],
  target_reached: ["quotation_requested", "cancelled"],
  closed_deadline: ["quotation_requested", "cancelled"],
  quotation_requested: ["quotation_review", "quotes_published", "cancelled"],
  quotation_review: ["quotation_requested", "quotes_published", "cancelled"],
  quotes_published: ["purchase_in_progress", "completed", "cancelled"],
  purchase_in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  expired: [],
};

export const TERMINAL_STATUSES: readonly BatchStatus[] = ["completed", "cancelled", "expired"];

export function canTransition(from: BatchStatus, to: BatchStatus) {
  return BATCH_TRANSITIONS[from].includes(to);
}

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  draft: "Draft",
  open: "Open for joining",
  target_reached: "Target reached",
  closed_deadline: "Closed at deadline",
  quotation_requested: "Quotations requested",
  quotation_review: "Quotations under review",
  quotes_published: "Quotations published",
  purchase_in_progress: "Purchases in progress",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export type StatusTone = "neutral" | "success" | "info" | "warning" | "danger";

export const BATCH_STATUS_TONE: Record<BatchStatus, StatusTone> = {
  draft: "neutral",
  open: "success",
  target_reached: "info",
  closed_deadline: "info",
  quotation_requested: "info",
  quotation_review: "info",
  quotes_published: "success",
  purchase_in_progress: "success",
  completed: "neutral",
  cancelled: "danger",
  expired: "warning",
};

/** Plain-language explanation of where dealer quotation coordination stands. */
export function coordinationSummary(status: BatchStatus): string {
  switch (status) {
    case "draft":
      return "This group has not opened yet.";
    case "open":
      return "Collecting verified participants. Dealer quotations are requested only after the group closes.";
    case "target_reached":
    case "closed_deadline":
      return "The group has closed. We are identifying eligible authorised dealerships to request quotations from.";
    case "quotation_requested":
      return "Quotation requests have been sent to authorised dealerships. We are waiting for responses.";
    case "quotation_review":
      return "Dealerships have responded. Our team is checking each itemised quotation before publishing it.";
    case "quotes_published":
      return "Reviewed quotations are available to verified participants in their dashboard.";
    case "purchase_in_progress":
      return "Participants are speaking with dealerships. Purchases are made directly with the dealership.";
    case "completed":
      return "This group has finished.";
    case "cancelled":
      return "This group was cancelled. Nobody was charged anything.";
    case "expired":
      return "This group closed without enough verified participants, so no quotations were requested.";
  }
}

export function isJoinable(batch: Pick<Batch, "status" | "deadline" | "verified_participant_count" | "target_participants">, now = new Date()) {
  return (
    batch.status === "open" &&
    new Date(batch.deadline).getTime() > now.getTime() &&
    batch.verified_participant_count < batch.target_participants
  );
}

export function progressPercent(batch: Pick<Batch, "verified_participant_count" | "target_participants">) {
  if (batch.target_participants <= 0) return 0;
  return Math.min(100, Math.round((batch.verified_participant_count / batch.target_participants) * 100));
}

export function spotsLeft(batch: Pick<Batch, "verified_participant_count" | "target_participants">) {
  return Math.max(0, batch.target_participants - batch.verified_participant_count);
}

/**
 * The outcome a closure would produce. Mirrors public.close_batch(): reaching
 * the target always wins; otherwise the minimum decides between requesting
 * quotations and expiring.
 */
export function closureOutcome(
  batch: Pick<Batch, "verified_participant_count" | "target_participants" | "minimum_participants">,
): "target_reached" | "closed_deadline" | "expired" {
  if (batch.verified_participant_count >= batch.target_participants) return "target_reached";
  if (batch.verified_participant_count >= batch.minimum_participants) return "closed_deadline";
  return "expired";
}

export const ACTIVE_PUBLIC_STATUSES: readonly BatchStatus[] = [
  "open",
  "target_reached",
  "closed_deadline",
  "quotation_requested",
  "quotation_review",
  "quotes_published",
  "purchase_in_progress",
];
