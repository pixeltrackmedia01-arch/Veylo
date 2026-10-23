"use server";

import { revalidatePath } from "next/cache";
import type { ActionInput } from "@/components/shared/action-button";
import { fail, friendlyError, ok, type ActionResult } from "@/lib/errors";
import { flushNotificationsSoon } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  agreementSchema,
  contentPageSchema,
  dealerSchema,
  faqSchema,
  fieldErrors,
  type AgreementInput,
  type DealerInput,
} from "@/lib/validation/schemas";
import { guardAdmin, isUuid } from "./guard";

async function audit(action: string, entityType: string, entityId: string, after?: unknown, reason?: string) {
  const supabase = await createClient();
  await supabase.rpc("app_log_audit", {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_before: null,
    p_after: after ?? null,
    p_reason: reason ?? null,
  });
}

async function rpc(fn: string, args: Record<string, unknown>) {
  const supabase = await createClient();
  return supabase.rpc(fn, args);
}

// --- Users -------------------------------------------------------------------

export async function setSuspensionAction(userId: string, suspend: boolean, input: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const { error } = await rpc("admin_set_user_suspension", { p_user_id: userId, p_suspend: suspend, p_reason: input.reason ?? null });
  if (error) return fail(error);
  revalidatePath(`/admin/users/${userId}`);
  return ok(suspend ? "Account suspended; memberships stop counting." : "Account reinstated.");
}

export async function setRoleAction(userId: string, role: "admin" | "dealer" | "customer", grant: boolean): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const { error } = await rpc("admin_set_role", { p_user_id: userId, p_role: role, p_grant: grant });
  if (error) return fail(error);
  revalidatePath(`/admin/users/${userId}`);
  return ok(grant ? `Granted ${role} role.` : `Removed ${role} role.`);
}

export async function markPhoneVerifiedAction(userId: string, input: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const { error } = await rpc("admin_mark_phone_verified", { p_user_id: userId, p_reason: input.reason ?? null });
  if (error) return fail(error);
  revalidatePath(`/admin/users/${userId}`);
  return ok("Mobile number marked as verified.");
}

// --- Dealers -----------------------------------------------------------------

export async function saveDealerAction(id: string | null, input: DealerInput): Promise<ActionResult<{ id: string }>> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const parsed = dealerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const supabase = await createClient();
  const row = {
    name: d.name,
    slug: d.slug,
    branch_address: d.branchAddress,
    city_id: d.cityId,
    contact_person: d.contactPerson || null,
    business_email: d.businessEmail ?? null,
    business_phone: d.businessPhone || null,
    is_active: d.isActive,
    is_demo: d.isDemo,
  };
  const { data, error } = id
    ? await supabase.from("dealers").update(row).eq("id", id).select("id").single()
    : await supabase.from("dealers").insert(row).select("id").single();
  if (error) return fail(error);
  const dealerId = data.id as string;

  // Sync authorised brands.
  const { data: existing } = await supabase.from("dealer_brands").select("manufacturer_id").eq("dealer_id", dealerId);
  const current = new Set((existing ?? []).map((r) => r.manufacturer_id as string));
  const wanted = new Set(d.manufacturerIds);
  const toAdd = [...wanted].filter((m) => !current.has(m));
  const toRemove = [...current].filter((m) => !wanted.has(m));
  if (toAdd.length) {
    const { error: e } = await supabase.from("dealer_brands").insert(toAdd.map((m) => ({ dealer_id: dealerId, manufacturer_id: m })));
    if (e) return fail(e);
  }
  if (toRemove.length) {
    const { error: e } = await supabase.from("dealer_brands").delete().eq("dealer_id", dealerId).in("manufacturer_id", toRemove);
    if (e) return fail(e);
  }
  if (d.internalNotes !== undefined) {
    await supabase.from("dealer_admin_notes").upsert({ dealer_id: dealerId, notes: d.internalNotes, updated_by: g.viewer.id });
  }
  await audit(id ? "dealer.updated" : "dealer.created", "dealer", dealerId, { ...row, brands: d.manufacturerIds });
  revalidatePath("/admin/dealers", "layout");
  return ok(id ? "Dealer saved." : "Dealer added. Verify its authorisation before it can receive requests.", { id: dealerId });
}

export async function setDealerAuthorizationAction(dealerId: string, status: string, input: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const { error } = await rpc("admin_set_dealer_authorization", { p_dealer_id: dealerId, p_status: status, p_reason: input.reason ?? null });
  if (error) return fail(error);
  revalidatePath(`/admin/dealers/${dealerId}`);
  return ok(`Authorisation set to ${status}.`);
}

export async function linkDealerUserAction(dealerId: string, input: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const email = input.value?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter the staff member's account email." };
  const { error } = await rpc("admin_link_dealer_user", { p_dealer_id: dealerId, p_email: email, p_job_title: input.reason ?? null });
  if (error) return fail(error);
  revalidatePath(`/admin/dealers/${dealerId}`);
  return ok("Dealer portal access granted.");
}

export async function unlinkDealerUserAction(dealerUserId: string, dealerId: string): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const { error } = await rpc("admin_unlink_dealer_user", { p_dealer_user_id: dealerUserId });
  if (error) return fail(error);
  revalidatePath(`/admin/dealers/${dealerId}`);
  return ok("Access removed.");
}

// --- Quotations --------------------------------------------------------------

export async function startQuotationForDealerAction(requestId: string): Promise<ActionResult<{ id: string }>> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const { data, error } = await rpc("start_quotation", { p_request_id: requestId });
  if (error) return fail(error);
  const id = (data as { id: string }).id;
  return ok("Quotation draft created — enter the dealer's response.", { id });
}

export async function reviewQuotationAction(quotationId: string, action: string, input?: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (!isUuid(quotationId)) return { ok: false, error: "Invalid quotation." };
  const allowed = ["start_review", "approve", "request_changes", "reject", "publish", "expire", "withdraw"];
  if (!allowed.includes(action)) return { ok: false, error: "Unknown action." };
  const { error } = await rpc("admin_review_quotation", { p_quotation_id: quotationId, p_action: action, p_notes: input?.reason ?? null });
  if (error) return fail(error);
  flushNotificationsSoon();
  revalidatePath(`/admin/quotations/${quotationId}`);
  revalidatePath("/admin/quotations");
  const messages: Record<string, string> = {
    start_review: "Marked as under review.",
    approve: "Quotation approved. Publish it to share with participants.",
    request_changes: "Returned to the dealer for changes.",
    reject: "Quotation rejected.",
    publish: "Published to verified participants.",
    expire: "Marked as expired.",
    withdraw: "Marked as withdrawn.",
  };
  return ok(messages[action]);
}

export async function submitQuotationAsAdminAction(quotationId: string): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const { error } = await rpc("submit_quotation", { p_quotation_id: quotationId });
  if (error) return fail(error);
  revalidatePath(`/admin/quotations/${quotationId}`);
  return ok("Recorded as submitted. Review and approve it next.");
}

// --- Sales -------------------------------------------------------------------

export async function reviewSaleAction(saleId: string, action: string, input?: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (!isUuid(saleId)) return { ok: false, error: "Invalid sale." };
  if (!["request_evidence", "start_review", "reject", "verify"].includes(action)) return { ok: false, error: "Unknown action." };
  let basis: number | null = null;
  if (input?.value) {
    basis = Number(input.value);
    if (!Number.isFinite(basis) || basis < 0) return { ok: false, error: "Enter a valid basis amount." };
  }
  const { data, error } = await rpc("admin_review_sale", { p_sale_id: saleId, p_action: action, p_note: input?.reason ?? null, p_basis_amount: basis });
  if (error) return fail(error);
  flushNotificationsSoon();
  revalidatePath(`/admin/sales/${saleId}`);
  revalidatePath("/admin/commissions");
  const result = data as { commission_id: string | null; commission_error: string | null };
  if (action === "verify") {
    if (result.commission_id) return ok("Sale verified and commission recorded from the applicable agreement.");
    return ok(`Sale verified. Commission not created yet: ${friendlyError(result.commission_error ?? "")}`);
  }
  return ok("Sale updated.");
}

export async function createCommissionAction(saleId: string, input: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const basis = input.value ? Number(input.value) : null;
  if (basis !== null && (!Number.isFinite(basis) || basis < 0)) return { ok: false, error: "Enter a valid basis amount." };
  const { error } = await rpc("admin_create_commission", { p_sale_id: saleId, p_basis_amount: basis });
  if (error) return fail(error);
  revalidatePath(`/admin/sales/${saleId}`);
  revalidatePath("/admin/commissions");
  return ok("Commission recorded.");
}

// --- Commissions -------------------------------------------------------------

export async function updateCommissionAction(
  commissionId: string,
  status: string,
  input: ActionInput & { invoiceReference?: string; paymentReference?: string },
): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const paymentDate = status === "paid" ? input.value : null;
  if (status === "paid" && (!paymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate))) {
    return { ok: false, error: "Enter the date the payment was received." };
  }
  const { error } = await rpc("admin_update_commission", {
    p_commission_id: commissionId,
    p_status: status,
    p_invoice_reference: status === "invoiced" ? (input.value ?? null) : (input.invoiceReference ?? null),
    p_payment_date: paymentDate,
    p_payment_reference: input.paymentReference ?? (status === "paid" ? (input.reason ?? null) : null),
    p_note: input.reason ?? null,
  });
  if (error) return fail(error);
  revalidatePath("/admin/commissions");
  return ok("Commission updated.");
}

export async function adjustCommissionAction(commissionId: string, input: ActionInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const amount = Number(input.value);
  if (!Number.isFinite(amount)) return { ok: false, error: "Enter the adjustment amount (negative to reduce)." };
  const { error } = await rpc("admin_adjust_commission", { p_commission_id: commissionId, p_adjustment: amount, p_reason: input.reason ?? null });
  if (error) return fail(error);
  revalidatePath("/admin/commissions");
  return ok("Adjustment recorded in the audit log.");
}

export async function createAgreementAction(input: AgreementInput): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const parsed = agreementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const a = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_agreements")
    .insert({
      name: a.name,
      dealer_id: a.dealerId ?? null,
      manufacturer_id: a.manufacturerId ?? null,
      vehicle_id: a.vehicleId ?? null,
      variant_id: a.variantId ?? null,
      batch_id: a.batchId ?? null,
      calc_type: a.calcType,
      fixed_amount: a.calcType === "fixed" ? a.fixedAmount : null,
      percentage: a.calcType === "percentage" ? a.percentage : null,
      basis_label: a.calcType === "percentage" ? a.basisLabel : null,
      basis_description: a.calcType === "percentage" ? (a.basisDescription ?? null) : null,
      cap_amount: a.capAmount ?? null,
      effective_from: a.effectiveFrom,
      effective_to: a.effectiveTo ?? null,
      status: a.status,
      notes: a.notes ?? null,
      created_by: g.viewer.id,
    })
    .select("id")
    .single();
  if (error) return fail(error);
  await audit("commission_agreement.created", "commission_agreement", data.id, a);
  revalidatePath("/admin/commissions/agreements");
  return ok("Agreement saved.");
}

export async function setAgreementStatusAction(id: string, status: "active" | "inactive"): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const supabase = await createClient();
  const { error } = await supabase.from("commission_agreements").update({ status }).eq("id", id);
  if (error) return fail(error);
  await audit("commission_agreement.status_changed", "commission_agreement", id, { status });
  revalidatePath("/admin/commissions/agreements");
  return ok(`Agreement ${status}.`);
}

// --- Content -----------------------------------------------------------------

export async function saveFaqAction(id: string | null, input: unknown): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const parsed = faqSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const f = parsed.data;
  const row = { question: f.question, answer: f.answer, category: f.category, sort_order: f.sortOrder, is_published: f.isPublished };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("faqs").update(row).eq("id", id).select("id").single()
    : await supabase.from("faqs").insert(row).select("id").single();
  if (error) return fail(error);
  await audit(id ? "faq.updated" : "faq.created", "faq", data.id, row);
  revalidatePath("/", "layout");
  return ok("FAQ saved.");
}

export async function deleteFaqAction(id: string): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const supabase = await createClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) return fail(error);
  await audit("faq.deleted", "faq", id);
  revalidatePath("/", "layout");
  return ok("FAQ deleted.");
}

export async function saveContentPageAction(input: unknown): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const parsed = contentPageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const c = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("content_pages").upsert(
    {
      slug: c.slug,
      title: c.title,
      summary: c.summary || null,
      body: c.body,
      requires_legal_review: c.requiresLegalReview,
      is_published: c.isPublished,
      updated_by: g.viewer.id,
    },
    { onConflict: "slug" },
  );
  if (error) return fail(error);
  await audit("content_page.saved", "content_page", c.slug, { title: c.title, requires_legal_review: c.requiresLegalReview });
  revalidatePath(`/${c.slug}`);
  return ok("Page saved.");
}

const EDITABLE_SETTINGS = new Set(["contact.public", "home.hero", "verification.require_phone", "batches.default_target", "batches.default_minimum"]);

export async function saveSettingAction(key: string, rawJson: string): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (!EDITABLE_SETTINGS.has(key)) return { ok: false, error: "That setting can't be edited here." };
  let value: unknown;
  try {
    value = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: "Enter valid JSON." };
  }
  if (key === "verification.require_phone" && typeof value !== "boolean") return { ok: false, error: "Use true or false." };
  if (key.startsWith("batches.") && (typeof value !== "number" || value < 1 || value > 500)) return { ok: false, error: "Enter a number between 1 and 500." };
  if ((key === "contact.public" || key === "home.hero") && (typeof value !== "object" || value === null || Array.isArray(value))) {
    return { ok: false, error: "Enter a JSON object." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").update({ value, updated_by: g.viewer.id }).eq("key", key);
  if (error) return fail(error);
  await audit("setting.updated", "app_setting", key, value);
  revalidatePath("/", "layout");
  return ok("Setting saved.");
}

export async function setContactMessageStatusAction(id: string, status: "new" | "in_progress" | "closed"): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/messages");
  return ok("Updated.");
}

export async function setLeadStatusAction(id: string, status: "new" | "contacted" | "converted" | "closed"): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (!isUuid(id)) return { ok: false, error: "Invalid lead." };
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin/leads");
  return ok("Updated.");
}

export async function dispatchEmailsNowAction(): Promise<ActionResult> {
  const g = await guardAdmin();
  if (g.error) return g.error;
  if (!createAdminClient()) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
  const { dispatchPendingEmails } = await import("@/lib/notifications/dispatcher");
  const r = await dispatchPendingEmails(100);
  return ok(
    r.enabled
      ? `Email provider ${r.provider}: ${r.sent} sent, ${r.failed} failed, ${r.skipped} skipped.`
      : `Email delivery is disabled (no provider configured): ${r.skipped} message(s) marked skipped, none sent.`,
  );
}
