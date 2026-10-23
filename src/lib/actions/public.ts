"use server";

import { fail, ok, type ActionResult } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { contactSchema, fieldErrors, type ContactInput } from "@/lib/validation/schemas";

export async function submitContactAction(input: ContactInput): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  // Honeypot filled: pretend success so bots learn nothing.
  if (parsed.data.website) return ok("Thanks — we'll get back to you soon.");
  const ip = await clientIp();
  if (!(await rateLimit("contact", ip, 5, 3600))) return fail("rate_limited");

  // submit_contact_message() validates and rate-limits per email, so this works without the service-role key.
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_contact_message", {
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone || null,
    p_subject: parsed.data.subject,
    p_message: parsed.data.message,
  });
  if (error) return fail(error);
  return ok("Thanks — your message has been received. We usually reply within two working days.");
}
