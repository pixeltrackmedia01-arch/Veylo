import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { dispatchPendingEmails } from "@/lib/notifications/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Scheduled job: closes batches at their deadline or target, requests dealer
 * quotations, sends deadline reminders, expires old quotations, then delivers
 * pending emails. Idempotent — safe to call as often as every few minutes.
 * Call with `Authorization: Bearer $CRON_SECRET`.
 */
async function run(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 500 });

  const { data, error } = await admin.rpc("process_due_batches");
  if (error) {
    console.error("process_due_batches failed", error.message);
    return NextResponse.json({ error: "Batch processing failed" }, { status: 500 });
  }
  const email = await dispatchPendingEmails(100);
  return NextResponse.json({ ok: true, batches: data, email });
}

export const GET = run;
export const POST = run;
