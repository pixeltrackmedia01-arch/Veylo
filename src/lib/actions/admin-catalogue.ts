"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { istLocalToISO } from "@/lib/format";
import { flushNotificationsSoon } from "@/lib/notifications";
import { validateUpload } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  batchSchema,
  fieldErrors,
  manufacturerSchema,
  priceSchema,
  variantSchema,
  vehicleSchema,
  type BatchInput,
  type PriceInput,
  type VariantInput,
  type VehicleInput,
} from "@/lib/validation/schemas";
import type { ActionInput } from "@/components/shared/action-button";
import { guardAdmin, isUuid } from "./guard";

async function audit(action: string, entityType: string, entityId: string, after?: unknown, reason?: string, before?: unknown) {
  const supabase = await createClient();
  await supabase.rpc("app_log_audit", {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_before: before ?? null,
    p_after: after ?? null,
    p_reason: reason ?? null,
  });
}

// --- Manufacturers -----------------------------------------------------------

export async function createManufacturerAction(input: unknown): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const parsed = manufacturerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manufacturers")
    .insert({ name: parsed.data.name, slug: parsed.data.slug, categories: parsed.data.categories, website_url: parsed.data.websiteUrl ?? null })
    .select("id")
    .single();
  if (error) return fail(error);
  await audit("manufacturer.created", "manufacturer", data.id, parsed.data);
  revalidatePath("/admin/vehicles");
  return ok("Manufacturer added.");
}

// --- Vehicles ----------------------------------------------------------------

function vehicleRow(v: ReturnType<typeof vehicleSchema.parse>) {
  return {
    manufacturer_id: v.manufacturerId,
    model_name: v.modelName,
    slug: v.slug,
    category: v.category,
    body_type: v.bodyType || null,
    description: v.description || null,
    highlights: (v.highlights ?? "")
      .split("\n")
      .map((h) => h.trim())
      .filter(Boolean)
      .slice(0, 8),
    is_demo: v.isDemo,
  };
}

export async function saveVehicleAction(id: string | null, input: VehicleInput): Promise<ActionResult<{ id: string }>> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  if (id) {
    if (!isUuid(id)) return { ok: false, error: "Invalid vehicle." };
    const { error } = await supabase.from("vehicles").update(vehicleRow(parsed.data)).eq("id", id);
    if (error) return fail(error);
    await audit("vehicle.updated", "vehicle", id, parsed.data);
    revalidatePath(`/admin/vehicles/${id}`);
    revalidatePath("/vehicles", "layout");
    return ok("Vehicle saved.", { id });
  }
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...vehicleRow(parsed.data), status: "draft", created_by: g.viewer.id })
    .select("id")
    .single();
  if (error) return fail(error);
  await audit("vehicle.created", "vehicle", data.id, parsed.data);
  revalidatePath("/admin/vehicles");
  return ok("Vehicle created as a draft.", { id: data.id });
}

export async function setVehicleStatusAction(id: string, status: "published" | "unpublished" | "archived" | "draft"): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (!isUuid(id)) return { ok: false, error: "Invalid vehicle." };
  const supabase = await createClient();
  if (status === "published") {
    const { count } = await supabase.from("vehicle_variants").select("id", { count: "exact", head: true }).eq("vehicle_id", id).eq("status", "published");
    if (!count) return { ok: false, error: "Publish at least one variant before publishing the vehicle." };
  }
  const { data: before } = await supabase.from("vehicles").select("status").eq("id", id).single();
  const { error } = await supabase
    .from("vehicles")
    .update({ status, ...(status === "published" ? { published_at: new Date().toISOString() } : {}) })
    .eq("id", id);
  if (error) return fail(error);
  await audit("vehicle.status_changed", "vehicle", id, { status }, undefined, before);
  revalidatePath(`/admin/vehicles/${id}`);
  revalidatePath("/vehicles", "layout");
  return ok(`Vehicle ${status}.`);
}

// --- Variants ----------------------------------------------------------------

function parseSpecs(text: string | undefined) {
  const specs: Record<string, string> = {};
  for (const line of (text ?? "").split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().slice(0, 60);
    const value = line.slice(idx + 1).trim().slice(0, 120);
    if (key && value) specs[key] = value;
  }
  return specs;
}

export async function saveVariantAction(id: string | null, input: VariantInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const row = {
    vehicle_id: v.vehicleId,
    name: v.name,
    slug: v.slug,
    fuel_type: v.fuelType,
    transmission: v.transmission,
    engine_cc: v.engineCc ?? null,
    specifications: parseSpecs(v.specifications),
    specs_source: v.specsSource || null,
    specs_verified_at: v.specsVerifiedAt || null,
    sort_order: v.sortOrder,
    status: v.status,
  };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("vehicle_variants").update(row).eq("id", id).select("id").single()
    : await supabase.from("vehicle_variants").insert(row).select("id").single();
  if (error) return fail(error);
  await audit(id ? "variant.updated" : "variant.created", "vehicle_variant", data.id, row);
  revalidatePath(`/admin/vehicles/${v.vehicleId}`);
  revalidatePath("/vehicles", "layout");
  return ok("Variant saved.");
}

// --- Prices ------------------------------------------------------------------

export async function addPriceAction(input: PriceInput, vehicleId: string): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const parsed = priceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const p = parsed.data;
  const supabase = await createClient();
  // Retire the previous current price for this variant & city, keeping it for history.
  const { error: retireError } = await supabase
    .from("vehicle_prices")
    .update({ is_current: false })
    .eq("variant_id", p.variantId)
    .eq("city_id", p.cityId)
    .eq("is_current", true);
  if (retireError) return fail(retireError);
  const { data, error } = await supabase
    .from("vehicle_prices")
    .insert({
      variant_id: p.variantId,
      city_id: p.cityId,
      ex_showroom: p.exShowroom,
      registration_road_tax: p.registrationRoadTax,
      insurance: p.insurance,
      accessories: p.accessories,
      extended_warranty: p.extendedWarranty,
      other_charges: p.otherCharges,
      price_kind: p.priceKind,
      source: p.source,
      source_url: p.sourceUrl ?? null,
      verified_at: p.verifiedAt,
      valid_until: p.validUntil ?? null,
      is_demo: p.isDemo,
      notes: p.notes || null,
      is_current: true,
      created_by: g.viewer.id,
    })
    .select("id")
    .single();
  if (error) return fail(error);
  await audit("price.recorded", "vehicle_price", data.id, p);
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  revalidatePath("/vehicles", "layout");
  return ok("Reference price recorded. The previous price was kept in history.");
}

export async function retirePriceAction(priceId: string, vehicleId: string): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (!isUuid(priceId)) return { ok: false, error: "Invalid price." };
  const supabase = await createClient();
  const { error } = await supabase.from("vehicle_prices").update({ is_current: false }).eq("id", priceId);
  if (error) return fail(error);
  await audit("price.retired", "vehicle_price", priceId);
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return ok("Price retired; it will no longer be shown.");
}

// --- Images ------------------------------------------------------------------

export async function uploadVehicleImageAction(formData: FormData): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const vehicleId = formData.get("vehicleId");
  const alt = String(formData.get("alt") ?? "").trim();
  const attribution = String(formData.get("attribution") ?? "").trim();
  if (!isUuid(vehicleId)) return { ok: false, error: "Invalid vehicle." };
  if (alt.length < 3) return { ok: false, error: "Describe the image (alt text) for accessibility." };
  if (attribution.length < 3) return { ok: false, error: "Record the image source or licence (e.g. 'Manufacturer press kit')." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Choose an image." };
  const checked = await validateUpload(file, "image");
  if (!checked.ok) return { ok: false, error: checked.error };

  const supabase = await createClient();
  const path = `${vehicleId}/${checked.filename}`;
  const { error: uploadError } = await supabase.storage.from("vehicle-images").upload(path, checked.bytes, { contentType: checked.mime });
  if (uploadError) return fail(uploadError, "Upload failed.");
  const { count } = await supabase.from("vehicle_images").select("id", { count: "exact", head: true }).eq("vehicle_id", vehicleId);
  const { error } = await supabase
    .from("vehicle_images")
    .insert({ vehicle_id: vehicleId, storage_path: path, alt_text: alt, attribution, is_placeholder: false, sort_order: count ?? 0 });
  if (error) return fail(error);
  await audit("vehicle_image.uploaded", "vehicle", vehicleId, { path });
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  revalidatePath("/vehicles", "layout");
  return ok("Image uploaded.");
}

export async function deleteVehicleImageAction(imageId: string, vehicleId: string): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const supabase = await createClient();
  const { data: img } = await supabase.from("vehicle_images").select("storage_path").eq("id", imageId).single();
  const { error } = await supabase.from("vehicle_images").delete().eq("id", imageId);
  if (error) return fail(error);
  if (img?.storage_path) await supabase.storage.from("vehicle-images").remove([img.storage_path]);
  await audit("vehicle_image.deleted", "vehicle", vehicleId, { imageId });
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return ok("Image removed.");
}

// --- Batches -----------------------------------------------------------------

export async function createBatchAction(input: BatchInput): Promise<ActionResult<{ id: string }>> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const b = parsed.data;
  const supabase = await createClient();
  // Status and counts are forced by the database (draft, 0) regardless of input.
  const { data, error } = await supabase
    .from("batches")
    .insert({
      slug: b.slug,
      variant_id: b.variantId,
      city_id: b.cityId,
      title: b.title,
      delivery_area: b.deliveryArea,
      eligibility_rules: b.eligibilityRules || null,
      target_participants: b.targetParticipants,
      minimum_participants: b.minimumParticipants,
      deadline: istLocalToISO(b.deadline),
      is_demo: b.isDemo,
    })
    .select("id")
    .single();
  if (error) return fail(error);
  await audit("batch.created", "batch", data.id, b);
  revalidatePath("/admin/batches");
  return ok("Batch created as a draft. Open it when you're ready.", { id: data.id });
}

export async function updateBatchDetailsAction(
  id: string,
  input: { title: string; deliveryArea: string; eligibilityRules?: string },
): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (!isUuid(id) || input.title.trim().length < 5 || input.deliveryArea.trim().length < 2) {
    return { ok: false, error: "Enter a title (5+ characters) and delivery area." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("batches")
    .update({ title: input.title.trim(), delivery_area: input.deliveryArea.trim(), eligibility_rules: input.eligibilityRules?.trim() || null })
    .eq("id", id);
  if (error) return fail(error);
  await audit("batch.details_updated", "batch", id, input);
  revalidatePath(`/admin/batches/${id}`);
  return ok("Batch details saved.");
}

export async function transitionBatchAction(id: string, to: string, input?: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (!isUuid(id)) return { ok: false, error: "Invalid batch." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_transition_batch", { p_batch_id: id, p_to: to, p_reason: input?.reason ?? null });
  if (error) return fail(error);
  flushNotificationsSoon();
  revalidatePath(`/admin/batches/${id}`);
  revalidatePath("/groups", "layout");
  return ok("Batch status updated.");
}

export async function extendDeadlineAction(id: string, input: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (!input.value || Number.isNaN(Date.parse(input.value))) return { ok: false, error: "Choose the new deadline." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_extend_batch_deadline", {
    p_batch_id: id,
    p_new_deadline: istLocalToISO(input.value),
    p_reason: input.reason ?? null,
  });
  if (error) return fail(error);
  flushNotificationsSoon();
  revalidatePath(`/admin/batches/${id}`);
  return ok("Deadline extended and participants notified.");
}

export async function requestQuotationsAction(id: string, dealerIds: string[] | null): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (dealerIds && !dealerIds.every(isUuid)) return { ok: false, error: "Invalid dealer selection." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_request_quotations", { p_batch_id: id, p_dealer_ids: dealerIds && dealerIds.length ? dealerIds : null });
  if (error) return fail(error);
  flushNotificationsSoon();
  revalidatePath(`/admin/batches/${id}`);
  return ok(data ? `${data} new quotation request(s) sent.` : "No new requests: selected dealers were already requested or aren't eligible.");
}

export async function requestIntentAction(id: string, input: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const respondBy = input.value ? istLocalToISO(input.value) : new Date(Date.now() + 5 * 864e5).toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_request_purchase_intent", { p_batch_id: id, p_respond_by: respondBy });
  if (error) return fail(error);
  flushNotificationsSoon();
  revalidatePath(`/admin/batches/${id}`);
  return ok(`Intent confirmation requested from ${data} participant(s).`);
}

export async function setMembershipEligibilityAction(membershipId: string, batchId: string, eligibility: string, input: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_membership_eligibility", {
    p_membership_id: membershipId,
    p_eligibility: eligibility,
    p_reason: input.reason ?? null,
  });
  if (error) return fail(error);
  revalidatePath(`/admin/batches/${batchId}`);
  return ok("Eligibility updated; participant count recalculated.");
}

export async function runBatchProcessingAction(): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  const { data, error } = await admin.rpc("process_due_batches");
  if (error) return fail(error);
  await audit("jobs.process_due_batches_manual", "system", "batches", data);
  flushNotificationsSoon();
  revalidatePath("/admin", "layout");
  const r = data as { closed: number; quotation_requests: number; reminders: number; expired_quotations: number };
  return ok(`Processed: ${r.closed} closed, ${r.quotation_requests} quote requests, ${r.reminders} reminders, ${r.expired_quotations} quotes expired.`);
}
