/**
 * Maps stable error codes raised by database functions (see
 * supabase/migrations/*_business_logic.sql) to user-facing messages.
 */
const MESSAGES: Record<string, string> = {
  not_authenticated: "Please sign in to continue.",
  forbidden: "You do not have permission to do that.",
  forbidden_field: "That field can't be changed here.",
  profile_missing: "Your profile could not be found. Please sign out and in again.",
  profile_incomplete: "Please complete your profile (name, mobile number and city) before joining a group.",
  email_not_verified: "Please verify your email address before joining a group.",
  account_suspended: "Your account is suspended. Please contact support.",
  batch_not_found: "This group could not be found.",
  batch_not_open: "This group is not open for new participants.",
  batch_full: "This group has already reached its target.",
  city_not_eligible: "This group is only open to residents of its city. Update your city in your profile if it is incorrect.",
  membership_removed: "You can't rejoin this group. Please contact support if you think this is a mistake.",
  not_a_member: "You are not a member of this group.",
  invalid_batch_transition: "That status change isn't allowed for this group.",
  batch_locked: "Target, vehicle and city can only be changed while the group is a draft.",
  deadline_in_past: "Set a future deadline before opening the group.",
  deadline_must_be_later: "The new deadline must be later than the current one and in the future.",
  reason_required: "Please give a reason (at least 5 characters).",
  batch_not_ready_for_quotes: "Quotations can only be requested after the group closes.",
  no_published_quotations: "Publish at least one quotation first.",
  intent_not_requested: "We haven't asked you to confirm intent for this group yet.",
  request_not_found: "Quotation request not found.",
  request_closed: "This quotation request is closed.",
  quotation_not_found: "Quotation not found.",
  quotation_locked: "This quotation can no longer be edited.",
  invalid_quotation_transition: "That action isn't available for this quotation's status.",
  ex_showroom_line_required: "Add an included ex-showroom price line before submitting.",
  valid_until_required: "Set a validity date (today or later) before submitting.",
  validity_extension_requires_review: "Extending validity requires admin review. You can shorten it, or contact the GroupDrive team.",
  invalid_total: "The quotation total must be greater than zero.",
  quotation_expired: "This quotation has expired.",
  quotation_not_available: "This quotation is not available.",
  not_a_verified_participant: "Only verified participants of this group can contact the dealership.",
  enquiry_not_found: "Enquiry not found.",
  enquiry_closed: "This enquiry is closed.",
  booking_not_found: "Booking not found.",
  booking_closed: "This booking can no longer be changed.",
  booking_date_in_future: "The booking date can't be in the future.",
  sale_date_in_future: "The sale date can't be in the future.",
  invalid_evidence_path: "Invalid evidence file.",
  sale_already_decided: "This sale has already been verified or rejected.",
  sale_not_found: "Sale record not found.",
  sale_not_verified: "Verify the sale before creating a commission.",
  conflict_of_interest: "You are linked to this dealership and can't verify its sales or commissions.",
  no_active_agreement: "No active commission agreement matches this sale. Create one, then generate the commission.",
  basis_amount_required: "This agreement is percentage-based: enter the commission basis amount.",
  commission_not_found: "Commission record not found.",
  invalid_commission_transition: "That payment status change isn't allowed.",
  payment_date_required: "Enter the payment date to mark this commission as paid.",
  commission_locked: "Paid or cancelled commissions can't be adjusted.",
  invalid_adjustment: "The adjustment would make the commission negative.",
  cannot_modify_self: "You can't change your own access this way.",
  user_not_found: "No account with that email exists yet. Ask them to sign up first.",
  user_not_verified: "This user hasn't completed verification.",
  phone_missing: "This user has no mobile number on file.",
  membership_not_found: "Membership not found.",
  invalid_action: "Unknown action.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
};

export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  const code = message.split(":")[0]?.trim();
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (message.includes("duplicate key")) return "That record already exists.";
  if (message.includes("permission denied") || message.includes("row-level security")) {
    return MESSAGES.forbidden;
  }
  return fallback;
}

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function ok<T>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function fail(error: unknown, fallback?: string): ActionResult<never> {
  return { ok: false, error: friendlyError(error, fallback) };
}
