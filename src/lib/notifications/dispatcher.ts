import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailProvider } from "./providers";
import { renderEmail } from "./templates";

const MAX_ATTEMPTS = 5;
// Reserved / documentation domains never receive mail (demo accounts use them).
const UNDELIVERABLE = /@(.+\.)?(example\.(com|org|net)|example|invalid|test|localhost)$/i;

export interface DispatchSummary {
  provider: string;
  enabled: boolean;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Delivers pending email notifications from the outbox. A row is marked
 * `sent` only when the provider confirms acceptance; with no provider
 * configured rows are marked `skipped` with an explanatory error.
 */
export async function dispatchPendingEmails(limit = 50): Promise<DispatchSummary> {
  const provider = getEmailProvider();
  const summary: DispatchSummary = { provider: provider.name, enabled: provider.enabled, sent: 0, failed: 0, skipped: 0 };
  const admin = createAdminClient();
  if (!admin) return summary;

  const { data, error } = await admin
    .from("notifications")
    .select("id, recipient_email, subject, body, link_path, attempts")
    .eq("channel", "email")
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);
  if (error || !data) return summary;

  for (const row of data as { id: string; recipient_email: string | null; subject: string; body: string; link_path: string | null; attempts: number }[]) {
    if (!row.recipient_email || UNDELIVERABLE.test(row.recipient_email)) {
      await admin.from("notifications").update({ status: "skipped", last_error: "Undeliverable or reserved address", provider: provider.name }).eq("id", row.id).eq("status", "pending");
      summary.skipped++;
      continue;
    }
    // Claim the row first so concurrent dispatchers never double-send.
    const { data: claimed } = await admin
      .from("notifications")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id)
      .eq("status", "pending")
      .eq("attempts", row.attempts)
      .select("id");
    if (!claimed?.length) continue;

    const result = await provider.send({ to: row.recipient_email, ...renderEmail(row) });
    if (result.ok) {
      await admin
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString(), provider: provider.name, provider_message_id: result.id, last_error: null })
        .eq("id", row.id);
      summary.sent++;
    } else if (!provider.enabled) {
      await admin.from("notifications").update({ status: "skipped", provider: provider.name, last_error: result.error }).eq("id", row.id);
      summary.skipped++;
    } else {
      const giveUp = !result.retryable || row.attempts + 1 >= MAX_ATTEMPTS;
      await admin
        .from("notifications")
        .update({ status: giveUp ? "failed" : "pending", provider: provider.name, last_error: result.error })
        .eq("id", row.id);
      summary.failed++;
    }
  }
  return summary;
}
