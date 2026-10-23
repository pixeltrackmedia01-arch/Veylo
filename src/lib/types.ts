/**
 * Row types for the tables in supabase/migrations. Numeric columns arrive from
 * PostgREST as numbers or strings depending on precision, so money fields are
 * typed as `number | string` and normalised with `toNumber()`.
 */

export type Money = number | string;

export type AppRole = "customer" | "dealer" | "admin";
export type VehicleCategory = "car" | "two_wheeler";
export type PublishStatus = "draft" | "published" | "unpublished" | "archived";
export type PurchaseTimeline = "immediately" | "within_1_month" | "within_3_months" | "within_6_months" | "exploring";

export type BatchStatus =
  | "draft"
  | "open"
  | "target_reached"
  | "closed_deadline"
  | "quotation_requested"
  | "quotation_review"
  | "quotes_published"
  | "purchase_in_progress"
  | "completed"
  | "cancelled"
  | "expired";

export type MembershipStatus = "active" | "withdrawn" | "removed";
export type MembershipEligibility = "pending_verification" | "verified" | "ineligible";
export type IntentStatus = "requested" | "confirmed" | "declined";
export type DealerAuthStatus = "pending" | "verified" | "rejected" | "suspended";
export type QuotationRequestStatus = "pending" | "sent" | "responded" | "declined" | "cancelled";
export type QuotationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "published"
  | "expired"
  | "withdrawn";
export type LineItemCategory =
  | "ex_showroom"
  | "registration_road_tax"
  | "insurance"
  | "accessories"
  | "extended_warranty"
  | "other_charge"
  | "discount";
export type EnquiryStatus =
  | "new"
  | "contacted"
  | "test_drive_scheduled"
  | "negotiating"
  | "booked"
  | "closed_lost"
  | "withdrawn";
export type BookingStatus = "booked" | "cancelled" | "delivered";
export type SaleStatus = "claimed" | "evidence_requested" | "under_review" | "verified" | "rejected";
export type CommissionCalcType = "fixed" | "percentage";
export type AgreementStatus = "draft" | "active" | "inactive";
export type CommissionStatus = "pending" | "invoiced" | "payable" | "paid" | "disputed" | "cancelled";

export interface City {
  id: string;
  name: string;
  slug: string;
  state: string;
  is_active: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city_id: string | null;
  preferred_category: VehicleCategory | null;
  purchase_timeline: PurchaseTimeline | null;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  notify_email: boolean;
  notify_batch_updates: boolean;
  notify_marketing: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  categories: VehicleCategory[];
  website_url: string | null;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  manufacturer_id: string;
  model_name: string;
  slug: string;
  category: VehicleCategory;
  body_type: string | null;
  description: string | null;
  highlights: string[];
  status: PublishStatus;
  is_demo: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleVariant {
  id: string;
  vehicle_id: string;
  name: string;
  slug: string;
  fuel_type: string | null;
  transmission: string | null;
  engine_cc: number | null;
  specifications: Record<string, string | number>;
  specs_source: string | null;
  specs_verified_at: string | null;
  status: PublishStatus;
  sort_order: number;
}

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  variant_id: string | null;
  storage_path: string | null;
  external_url: string | null;
  alt_text: string;
  attribution: string | null;
  is_placeholder: boolean;
  sort_order: number;
}

export interface VehiclePrice {
  id: string;
  variant_id: string;
  city_id: string;
  ex_showroom: Money;
  registration_road_tax: Money;
  insurance: Money;
  accessories: Money;
  extended_warranty: Money;
  other_charges: Money;
  on_road_total: Money;
  price_kind: "indicative" | "verified";
  source: string;
  source_url: string | null;
  verified_at: string;
  valid_until: string | null;
  is_current: boolean;
  is_demo: boolean;
  notes: string | null;
}

export interface Batch {
  id: string;
  slug: string;
  variant_id: string;
  city_id: string;
  title: string;
  delivery_area: string;
  eligibility_rules: string | null;
  target_participants: number;
  minimum_participants: number;
  deadline: string;
  status: BatchStatus;
  verified_participant_count: number;
  opened_at: string | null;
  closed_at: string | null;
  close_reason: "target_reached" | "deadline" | "manual" | null;
  cancelled_reason: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface BatchMembership {
  id: string;
  batch_id: string;
  user_id: string;
  status: MembershipStatus;
  eligibility: MembershipEligibility;
  ineligible_reason: string | null;
  joined_at: string;
  verified_at: string | null;
}

export interface PurchaseIntent {
  id: string;
  membership_id: string;
  batch_id: string;
  user_id: string;
  status: IntentStatus;
  requested_at: string;
  responded_at: string | null;
  respond_by: string | null;
  note: string | null;
}

export interface Dealer {
  id: string;
  name: string;
  slug: string;
  branch_address: string;
  city_id: string;
  contact_person: string | null;
  business_email: string | null;
  business_phone: string | null;
  authorization_status: DealerAuthStatus;
  authorization_verified_at: string | null;
  is_active: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface QuotationRequest {
  id: string;
  batch_id: string;
  dealer_id: string;
  status: QuotationRequestStatus;
  requested_at: string;
  response_due_at: string | null;
  responded_at: string | null;
  participant_count_snapshot: number;
  notes: string | null;
}

export interface DealerQuotation {
  id: string;
  quotation_request_id: string;
  batch_id: string;
  dealer_id: string;
  variant_id: string;
  status: QuotationStatus;
  quote_reference: string | null;
  total_payable: Money;
  total_discount: Money;
  valid_until: string | null;
  conditions: string | null;
  availability_note: string | null;
  delivery_timeline: string | null;
  document_path: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  approved_at: string | null;
  published_at: string | null;
  rejection_reason: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuotationLineItem {
  id: string;
  quotation_id: string;
  category: LineItemCategory;
  label: string;
  amount: Money;
  is_included: boolean;
  notes: string | null;
  sort_order: number;
}

export interface DealerEnquiry {
  id: string;
  batch_id: string;
  quotation_id: string;
  dealer_id: string;
  user_id: string;
  status: EnquiryStatus;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_message: string | null;
  dealer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  enquiry_id: string;
  dealer_id: string;
  user_id: string;
  batch_id: string;
  booking_reference: string | null;
  booking_date: string;
  expected_delivery_date: string | null;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
}

export interface SaleVerification {
  id: string;
  enquiry_id: string;
  booking_id: string | null;
  dealer_id: string;
  user_id: string;
  batch_id: string;
  variant_id: string;
  claimed_by_role: AppRole;
  sale_reference: string | null;
  invoice_number: string | null;
  sale_date: string;
  evidence_paths: string[];
  customer_confirmed_at: string | null;
  status: SaleStatus;
  evidence_request_note: string | null;
  admin_notes: string | null;
  verified_at: string | null;
  rejected_reason: string | null;
  created_at: string;
}

export interface CommissionAgreement {
  id: string;
  name: string;
  dealer_id: string | null;
  manufacturer_id: string | null;
  vehicle_id: string | null;
  variant_id: string | null;
  batch_id: string | null;
  calc_type: CommissionCalcType;
  fixed_amount: Money | null;
  percentage: Money | null;
  basis_label: string | null;
  basis_description: string | null;
  cap_amount: Money | null;
  effective_from: string;
  effective_to: string | null;
  status: AgreementStatus;
  notes: string | null;
  created_at: string;
}

export interface Commission {
  id: string;
  sale_verification_id: string;
  dealer_id: string;
  batch_id: string;
  variant_id: string;
  agreement_id: string;
  sale_reference: string | null;
  verified_completion_date: string;
  calc_type: CommissionCalcType;
  basis_label: string | null;
  basis_amount: Money | null;
  rate_percentage: Money | null;
  fixed_amount: Money | null;
  calculated_amount: Money;
  adjustment_amount: Money;
  adjustment_reason: string | null;
  final_amount: Money;
  invoice_reference: string | null;
  status: CommissionStatus;
  payment_date: string | null;
  payment_reference: string | null;
  dispute_status: "none" | "open" | "resolved";
  dispute_notes: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  type: string;
  subject: string;
  body: string;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_published: boolean;
}

export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  requires_legal_review: boolean;
  is_published: boolean;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: unknown;
  after_data: unknown;
  reason: string | null;
  created_at: string;
}

export function toNumber(value: Money | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
