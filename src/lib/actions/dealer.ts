"use server";

import { revalidatePath } from "next/cache";
import type { ActionInput } from "@/components/shared/action-button";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { flushNotificationsSoon } from "@/lib/notifications";
import { validateUpload } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema, fieldErrors, saleClaimSchema } from "@/lib/validation/schemas";
import { guardDealer, isUuid } from "./guard";

// Every function below is also authorised inside the database: a dealer user
// can only act on records belonging to their own dealership.

export async function startQuotationAction(requestId: string): Promise<ActionResult<{ id: string }>> {
  const g = await guardDealer();
  if (g.error) return g.error;
  if (!isUuid(requestId)) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_quotation", { p_request_id: requestId });
  if (error) return fail(error);
  return ok("Draft created.", { id: (data as { id: string }).id });
}

export async function declineRequestAction(requestId: string, input: ActionInput): Promise<ActionResult> {
  const g = await guardDealer();
  if (g.error) return g.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc("dealer_decline_request", { p_request_id: requestId, p_reason: input.reason ?? null });
  if (error) return fail(error);
  revalidatePath("/dealer", "layout");
  return ok("Request declined.");
}

export async function submitQuotationAction(quotationId: string): Promise<ActionResult> {
  const g = await guardDealer();
  if (g.error) return g.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_quotation", { p_quotation_id: quotationId });
  if (error) return fail(error);
  revalidatePath(`/dealer/quotations/${quotationId}`);
  return ok("Submitted for GroupDrive review. You'll be notified when it's approved or if changes are needed.");
}

export async function withdrawQuotationAction(quotationId: string, input: ActionInput): Promise<ActionResult> {
  const g = await guardDealer();
  if (g.error) return g.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc("dealer_withdraw_quotation", { p_quotation_id: quotationId, p_reason: input.reason ?? null });
  if (error) return fail(error);
  revalidatePath(`/dealer/quotations/${quotationId}`);
  return ok("Quotation withdrawn.");
}

/** Availability can change at any time; validity can only be shortened after submission (DB-enforced). */
export async function updateAvailabilityAction(quotationId: string, input: { availabilityNote: string; validUntil: string }): Promise<ActionResult> {
  const g = await guardDealer();
  if (g.error) return g.error;
  if (!isUuid(quotationId) || !/^\d{4}-\d{2}-\d{2}$/.test(input.validUntil)) return { ok: false, error: "Enter a valid date." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("dealer_quotations")
    .update({ availability_note: input.availabilityNote.trim().slice(0, 500) || null, valid_until: input.validUntil })
    .eq("id", quotationId);
  if (error) return fail(error);
  revalidatePath(`/dealer/quotations/${quotationId}`);
  return ok("Availability updated.");
}

export async function updateEnquiryStatusAction(enquiryId: string, status: string, input?: ActionInput): Promise<ActionResult> {
  const g = await guardDealer();
  if (g.error) return g.error;
  if (!["contacted", "test_drive_scheduled", "negotiating", "closed_lost"].includes(status)) return { ok: false, error: "Invalid status." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_enquiry_status", { p_enquiry_id: enquiryId, p_status: status, p_notes: input?.reason ?? null });
  if (error) return fail(error);
  flushNotificationsSoon();
  revalidatePath("/dealer/enquiries");
  return ok("Enquiry updated; the customer has been notified.");
}

export async function recordBookingAction(input: { enquiryId: string; bookingDate: string; reference?: string; expectedDelivery?: string }): Promise<ActionResult> {
  const g = await guardDealer();
  if (g.error) return g.error;
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the booking details.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_booking", {
    p_enquiry_id: parsed.data.enquiryId,
    p_booking_date: parsed.data.bookingDate,
    p_reference: parsed.data.reference,
    p_expected_delivery: parsed.data.expectedDelivery ?? null,
  });
  if (error) return fail(error);
  flushNotificationsSoon();
  revalidatePath("/dealer/enquiries");
  return ok("Booking recorded.");
}

export async function updateBookingStatusAction(bookingId: string, status: "cancelled" | "delivered", input?: ActionInput): Promise<ActionResult> {
  const g = await guardDealer();
  if (g.error) return g.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_booking_status", { p_booking_id: bookingId, p_status: status, p_notes: input?.reason ?? null });
  if (error) return fail(error);
  flushNotificationsSoon();
  revalidatePath("/dealer/enquiries");
  return ok(`Booking marked ${status}.`);
}

/** Dealers may claim a completed sale; only GroupDrive admins can verify it. */
export async function submitDealerSaleClaimAction(formData: FormData): Promise<ActionResult> {
  const g = await guardDealer();
  if (g.error) return g.error;
  const parsed = saleClaimSchema.safeParse({
    enquiryId: formData.get("enquiryId"),
    saleDate: formData.get("saleDate"),
    invoiceNumber: formData.get("invoiceNumber") || undefined,
    saleReference: formData.get("saleReference") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const evidence: string[] = [];
  const file = formData.get("evidence");
  if (file instanceof File && file.size > 0) {
    const checked = await validateUpload(file, "document");
    if (!checked.ok) return { ok: false, error: checked.error };
    const path = `${parsed.data.enquiryId}/${checked.filename}`;
    const { error: uploadError } = await supabase.storage.from("sale-evidence").upload(path, checked.bytes, { contentType: checked.mime });
    if (uploadError) return fail(uploadError, "Upload failed.");
    evidence.push(path);
  }
  const { error } = await supabase.rpc("submit_sale_claim", {
    p_enquiry_id: parsed.data.enquiryId,
    p_sale_date: parsed.data.saleDate,
    p_invoice_number: parsed.data.invoiceNumber,
    p_sale_reference: parsed.data.saleReference,
    p_evidence_paths: evidence,
  });
  if (error) return fail(error);
  revalidatePath("/dealer", "layout");
  return ok("Sale claim submitted for GroupDrive verification.");
}
