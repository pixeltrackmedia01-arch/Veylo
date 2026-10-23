import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  let s = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  return [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\r\n");
}

const flat = (o: unknown, key: string) => (o && typeof o === "object" ? (o as Record<string, unknown>)[key] : undefined);

/** Admin-only CSV export. RLS applies to every query as an extra guard. */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type");
  const supabase = await createClient();
  let csv: string;

  if (type === "commissions") {
    let q = supabase.from("commissions").select("*, dealer:dealers(name), batch:batches(title)").order("created_at", { ascending: false }).limit(10000);
    if (sp.get("status")) q = q.eq("status", sp.get("status")!);
    if (sp.get("dealer")) q = q.eq("dealer_id", sp.get("dealer")!);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: "Export failed" }, { status: 500 });
    const rows = (data ?? []).map((r) => ({ ...r, dealer: flat(r.dealer, "name"), batch: flat(r.batch, "title") }));
    csv = toCsv(rows, ["id", "dealer", "batch", "sale_reference", "verified_completion_date", "calc_type", "basis_label", "basis_amount", "rate_percentage", "fixed_amount", "calculated_amount", "adjustment_amount", "adjustment_reason", "final_amount", "invoice_reference", "status", "payment_date", "payment_reference", "dispute_status", "created_at"]);
  } else if (type === "claims") {
    const { data } = await supabase.from("sale_verifications").select("*, dealer:dealers(name)").order("created_at", { ascending: false }).limit(10000);
    const rows = (data ?? []).map((r) => ({ ...r, dealer: flat(r.dealer, "name") }));
    csv = toCsv(rows, ["id", "dealer", "status", "sale_date", "invoice_number", "sale_reference", "claimed_by_role", "customer_confirmed_at", "verified_at", "created_at"]);
  } else if (type === "enquiries") {
    const { data } = await supabase.from("dealer_enquiries").select("id, status, created_at, dealer:dealers(name), batch:batches(title)").order("created_at", { ascending: false }).limit(10000);
    const rows = (data ?? []).map((r) => ({ ...r, dealer: flat(r.dealer, "name"), batch: flat(r.batch, "title") }));
    // Customer contact details are intentionally excluded from bulk exports.
    csv = toCsv(rows, ["id", "dealer", "batch", "status", "created_at"]);
  } else if (type === "bookings") {
    const { data } = await supabase.from("bookings").select("id, status, booking_date, booking_reference, created_at, dealer:dealers(name)").order("created_at", { ascending: false }).limit(10000);
    const rows = (data ?? []).map((r) => ({ ...r, dealer: flat(r.dealer, "name") }));
    csv = toCsv(rows, ["id", "dealer", "booking_reference", "booking_date", "status", "created_at"]);
  } else {
    return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
  }

  await supabase.rpc("app_log_audit", { p_action: "export.csv", p_entity_type: "export", p_entity_id: type, p_before: null, p_after: Object.fromEntries(sp), p_reason: null });
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="groupdrive-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
