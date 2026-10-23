"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { flushNotificationsSoon } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { validateUpload } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { enquirySchema, fieldErrors, intentSchema, profileSchema, saleClaimSchema, type ProfileInput } from "@/lib/validation/schemas";

const NOT_SIGNED_IN: ActionResult<never> = { ok: false, error: "Please sign in to continue." };

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

export async function joinBatchAction(batchId: string): Promise<ActionResult<{ eligibility: string; alreadyMember: boolean }>> {
  const viewer = await getViewer();
  if (!viewer) return NOT_SIGNED_IN;
  if (!isUuid(batchId)) return { ok: false, error: "Invalid group." };
  if (!(await rateLimit("join", viewer.id, 20, 60))) return fail("rate_limited");

  const supabase = await createClient();
  // Identity comes from the session inside join_batch(); the client sends only the batch id.
  const { data, error } = await supabase.rpc("join_batch", { p_batch_id: batchId });
  if (error) return fail(error);
  const result = data as { eligibility: string; already_member: boolean };
  flushNotificationsSoon();
  revalidatePath("/groups", "layout");
  revalidatePath("/dashboard", "layout");
  if (result.already_member) return ok("You're already in this group.", { eligibility: result.eligibility, alreadyMember: true });
  return ok(
    result.eligibility === "verified"
      ? "You've joined the group — it's free. We'll keep you updated."
      : "You've joined. You'll count toward the target once your verification is complete.",
    { eligibility: result.eligibility, alreadyMember: false },
  );
}

export async function leaveBatchAction(batchId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return NOT_SIGNED_IN;
  if (!isUuid(batchId)) return { ok: false, error: "Invalid group." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_batch", { p_batch_id: batchId });
  if (error) return fail(error);
  revalidatePath("/groups", "layout");
  revalidatePath("/dashboard", "layout");
  return ok("You've left the group.");
}

export async function respondIntentAction(input: { batchId: string; confirm: boolean; note?: string }): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return NOT_SIGNED_IN;
  const parsed = intentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid response.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_purchase_intent", {
    p_batch_id: parsed.data.batchId,
    p_confirm: parsed.data.confirm,
    p_note: parsed.data.note ?? null,
  });
  if (error) return fail(error);
  revalidatePath(`/dashboard/groups/${parsed.data.batchId}`);
  return ok(parsed.data.confirm ? "Thanks — your buying intent is confirmed." : "Thanks — we've noted that you're no longer planning to buy.");
}

export async function createEnquiryAction(input: {
  quotationId: string;
  message?: string;
  sharePhone: boolean;
  consent: boolean;
}): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return NOT_SIGNED_IN;
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid enquiry.", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("enquiry", viewer.id, 10, 3600))) return fail("rate_limited");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_enquiry", {
    p_quotation_id: parsed.data.quotationId,
    p_message: parsed.data.message ?? null,
    p_share_phone: parsed.data.sharePhone,
  });
  if (error) return fail(error);
  flushNotificationsSoon();
  revalidatePath(`/dashboard/groups/${(data as { batch_id: string }).batch_id}`);
  return ok("The dealership has your details and will contact you. You remain under no obligation to buy.");
}

export async function withdrawEnquiryAction(enquiryId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return NOT_SIGNED_IN;
  if (!isUuid(enquiryId)) return { ok: false, error: "Invalid enquiry." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_enquiry_status", { p_enquiry_id: enquiryId, p_status: "withdrawn", p_notes: null });
  if (error) return fail(error);
  revalidatePath("/dashboard", "layout");
  return ok("Enquiry withdrawn.");
}

/** Customer confirms they bought the vehicle; optional invoice upload as evidence. */
export async function submitPurchaseClaimAction(formData: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return NOT_SIGNED_IN;
  const parsed = saleClaimSchema.safeParse({
    enquiryId: formData.get("enquiryId"),
    saleDate: formData.get("saleDate"),
    invoiceNumber: formData.get("invoiceNumber") || undefined,
    saleReference: undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form.", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("sale-claim", viewer.id, 10, 3600))) return fail("rate_limited");

  const supabase = await createClient();
  const evidence: string[] = [];
  const file = formData.get("evidence");
  if (file instanceof File && file.size > 0) {
    const checked = await validateUpload(file, "document");
    if (!checked.ok) return { ok: false, error: checked.error };
    const path = `${parsed.data.enquiryId}/${checked.filename}`;
    // Storage RLS confirms the uploader is a party to this enquiry.
    const { error: uploadError } = await supabase.storage
      .from("sale-evidence")
      .upload(path, checked.bytes, { contentType: checked.mime, upsert: false });
    if (uploadError) return fail(uploadError, "Upload failed. Please try again.");
    evidence.push(path);
  }

  const { error } = await supabase.rpc("submit_sale_claim", {
    p_enquiry_id: parsed.data.enquiryId,
    p_sale_date: parsed.data.saleDate,
    p_invoice_number: parsed.data.invoiceNumber,
    p_sale_reference: null,
    p_evidence_paths: evidence,
  });
  if (error) return fail(error);
  revalidatePath("/dashboard", "layout");
  return ok("Thanks! We'll verify the purchase with the dealership.");
}

export async function updateProfileAction(input: ProfileInput): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return NOT_SIGNED_IN;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  // Column grants restrict this update to personal fields; verification flags can't be set here.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      city_id: parsed.data.cityId,
      preferred_category: parsed.data.preferredCategory,
      purchase_timeline: parsed.data.purchaseTimeline,
      notify_email: parsed.data.notifyEmail,
      notify_batch_updates: parsed.data.notifyBatchUpdates,
      notify_marketing: parsed.data.notifyMarketing,
    })
    .eq("id", viewer.id);
  if (error) return fail(error);
  revalidatePath("/dashboard", "layout");
  return ok("Profile saved.");
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return NOT_SIGNED_IN;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: null });
  if (error) return fail(error);
  revalidatePath("/dashboard", "layout");
  return ok("All caught up.");
}

/**
 * Short-lived link to a quotation document. The user-scoped read proves the
 * caller may see this quotation (RLS); only then is a signed URL issued.
 */
export async function quotationDocumentLinkAction(quotationId: string): Promise<ActionResult<{ url: string }>> {
  const viewer = await getViewer();
  if (!viewer) return NOT_SIGNED_IN;
  if (!isUuid(quotationId)) return { ok: false, error: "Invalid quotation." };
  const supabase = await createClient();
  const { data } = await supabase.from("dealer_quotations").select("id, document_path").eq("id", quotationId).maybeSingle();
  if (!data?.document_path) return { ok: false, error: "No document is attached to this quotation." };
  const admin = createAdminClient();
  const client = admin ?? supabase;
  const { data: signed, error } = await client.storage.from("quotation-documents").createSignedUrl(data.document_path, 120);
  if (error || !signed) return fail(error, "Could not open the document.");
  return ok(undefined, { url: signed.signedUrl });
}
