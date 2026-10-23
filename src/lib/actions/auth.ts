"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/env";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils";
import {
  emailOnlySchema,
  fieldErrors,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type SignUpInput,
} from "@/lib/validation/schemas";

export async function signUpAction(input: SignUpInput, next?: string): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("signup", await clientIp(), 5, 3600))) return fail("rate_limited");

  const supabase = await createClient();
  const { data: city } = await supabase.from("cities").select("slug").eq("slug", parsed.data.city).eq("is_active", true).maybeSingle();
  if (!city) return { ok: false, error: "We currently operate only in active cities.", fieldErrors: { city: ["Select an available city"] } };

  const redirectTo = `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent(safeRedirectPath(next))}`;
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: redirectTo,
      // Read by the handle_new_auth_user() trigger to create the profile. Roles are never taken from here.
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        city: parsed.data.city,
        preferred_category: parsed.data.preferredCategory,
        purchase_timeline: parsed.data.purchaseTimeline,
      },
    },
  });
  if (error) return fail(error, error.message);
  // When email confirmation is disabled in Supabase a session is returned immediately.
  if (data.session) redirect(safeRedirectPath(next));
  return ok("Check your inbox to verify your email address.");
}

export async function signInAction(input: { email: string; password: string }, next?: string): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter your email and password.", fieldErrors: fieldErrors(parsed.error) };
  const ip = await clientIp();
  if (!(await rateLimit("login-ip", ip, 30, 600)) || !(await rateLimit("login-email", parsed.data.email, 10, 600))) {
    return fail("rate_limited");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ok: false, error: "Please verify your email first. We can resend the link from the verification page." };
    }
    // Same message for unknown email and wrong password.
    return { ok: false, error: "Incorrect email or password." };
  }
  redirect(safeRedirectPath(next));
}

export async function requestPasswordResetAction(input: { email: string }): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  if (!(await rateLimit("reset", await clientIp(), 5, 3600))) return fail("rate_limited");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/reset-password`,
  });
  // Never reveal whether an account exists.
  return ok("If an account exists for that email, you'll receive a reset link shortly.");
}

export async function resendVerificationAction(input: { email: string }): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  if (!(await rateLimit("resend", await clientIp(), 3, 3600))) return fail("rate_limited");
  const supabase = await createClient();
  await supabase.auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: `${getSiteUrl()}/auth/confirm` } });
  return ok("If that account still needs verification, a new link is on its way.");
}

export async function updatePasswordAction(input: { password: string; confirm: string }): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { ok: false, error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error, error.message);
  return ok("Password updated.");
}
