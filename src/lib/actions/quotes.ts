"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { validateUpload } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, quotationSchema, type QuotationInput } from "@/lib/validation/schemas";
import { isUuid } from "./guard";

/**
 * Saves a quotation's header and itemised lines atomically (save_quotation RPC).
 * Used by dealers (drafts) and admins (recording or correcting before approval);
 * the database decides who may edit which status. Totals are computed server-side.
 */
export async function saveQuotationAction(quotationId: string, input: QuotationInput): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || !(viewer.isAdmin || viewer.isDealer)) return { ok: false, error: "You do not have permission to do that." };
  if (!isUuid(quotationId)) return { ok: false, error: "Invalid quotation." };
  const parsed = quotationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the quotation.", fieldErrors: fieldErrors(parsed.error) };
  const q = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_quotation", {
    p_quotation_id: quotationId,
    p_header: {
      quote_reference: q.quoteReference ?? "",
      valid_until: q.validUntil,
      conditions: q.conditions ?? "",
      availability_note: q.availabilityNote ?? "",
      delivery_timeline: q.deliveryTimeline ?? "",
    },
    p_items: q.items.map((i) => ({ category: i.category, label: i.label, amount: i.amount, is_included: i.isIncluded, notes: i.notes ?? "" })),
  });
  if (error) return fail(error);
  revalidatePath(`/dealer/quotations/${quotationId}`);
  revalidatePath(`/admin/quotations/${quotationId}`);
  return ok("Quotation saved.");
}

export async function uploadQuotationDocumentAction(formData: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || !(viewer.isAdmin || viewer.isDealer)) return { ok: false, error: "You do not have permission to do that." };
  const quotationId = formData.get("quotationId");
  if (!isUuid(quotationId)) return { ok: false, error: "Invalid quotation." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Choose a file." };
  const checked = await validateUpload(file, "document");
  if (!checked.ok) return { ok: false, error: checked.error };

  const supabase = await createClient();
  const { data: quote } = await supabase.from("dealer_quotations").select("id, dealer_id").eq("id", quotationId).maybeSingle();
  if (!quote) return { ok: false, error: "Quotation not found." };
  const path = `${quote.dealer_id}/${quote.id}/${checked.filename}`;
  const { error: uploadError } = await supabase.storage.from("quotation-documents").upload(path, checked.bytes, { contentType: checked.mime });
  if (uploadError) return fail(uploadError, "Upload failed.");
  const { error } = await supabase.rpc("set_quotation_document", { p_quotation_id: quotationId, p_path: path });
  if (error) return fail(error);
  revalidatePath(`/dealer/quotations/${quotationId}`);
  revalidatePath(`/admin/quotations/${quotationId}`);
  return ok("Document attached.");
}

/** Signed link for dealer/admin viewing of private documents (RLS on storage applies). */
export async function privateFileLinkAction(bucket: "quotation-documents" | "sale-evidence", path: string): Promise<ActionResult<{ url: string }>> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Please sign in to continue." };
  if (!/^[0-9a-f-]{36}\/[A-Za-z0-9._/-]+$/.test(path) || path.includes("..")) return { ok: false, error: "Invalid file." };
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
  if (error || !data) return fail(error, "You can't open this file.");
  return ok(undefined, { url: data.signedUrl });
}
