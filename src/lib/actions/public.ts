"use server";

import { getViewer } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { contactSchema, fieldErrors, type ContactInput } from "@/lib/validation/schemas";

export async function submitContactAction(input: ContactInput): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  // Honeypot filled: pretend success so bots learn nothing.
  if (parsed.data.website) return ok("Thanks — we'll get back to you soon.");
  const ip = await clientIp();
  if (!(await rateLimit("contact", ip, 5, 3600))) return fail("rate_limited");

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "The contact form isn't configured yet. Please email us instead." };
  const viewer = await getViewer();
  const { error } = await admin.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    subject: parsed.data.subject,
    message: parsed.data.message,
    user_id: viewer?.id ?? null,
  });
  if (error) return fail(error);
  return ok("Thanks — your message has been received. We usually reply within two working days.");
}
