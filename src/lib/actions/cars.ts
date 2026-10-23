"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, leadSchema, type LeadInput } from "@/lib/validation/schemas";

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

/** Adds or removes a car from the signed-in user's saved list. */
export async function toggleSavedVehicleAction(vehicleId: string): Promise<ActionResult<{ saved: boolean }>> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Please sign in to save cars." };
  if (!isUuid(vehicleId)) return { ok: false, error: "Invalid car." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("saved_vehicles")
    .select("vehicle_id")
    .eq("user_id", viewer.id)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("saved_vehicles").delete().eq("user_id", viewer.id).eq("vehicle_id", vehicleId)
    : await supabase.from("saved_vehicles").insert({ user_id: viewer.id, vehicle_id: vehicleId });
  if (error) return fail(error);
  revalidatePath("/dashboard/saved");
  return ok(existing ? "Removed from saved cars." : "Saved. Find it under Saved cars.", { saved: !existing });
}

/** On-road price, test drive, call-back, loan, insurance and best-price enquiries. */
export async function submitLeadAction(input: LeadInput): Promise<ActionResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (parsed.data.website) return ok("Thanks — we'll call you shortly.");

  const supabase = await createClient();
  // submit_lead() validates, normalises the number and rate-limits per phone number.
  const { error } = await supabase.rpc("submit_lead", {
    p_kind: parsed.data.kind,
    p_name: parsed.data.name,
    p_phone: parsed.data.phone,
    p_city: parsed.data.city || null,
    p_vehicle_id: parsed.data.vehicleId ?? null,
    p_variant_id: parsed.data.variantId ?? null,
    p_message: parsed.data.message || null,
  });
  if (error) return fail(error);
  return ok("Thanks — our team will call you within one working day.");
}

/** Records a "Was this helpful?" vote; one vote per question per browser per day. */
export async function faqFeedbackAction(faqId: string, helpful: boolean, clientKey: string): Promise<ActionResult> {
  if (!isUuid(faqId)) return { ok: false, error: "Invalid question." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("faq_feedback", {
    p_faq_id: faqId,
    p_helpful: helpful,
    p_client_key: clientKey.slice(0, 64),
  });
  if (error) return fail(error);
  return ok("Thanks for the feedback.");
}
