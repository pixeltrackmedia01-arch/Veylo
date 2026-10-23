import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Batch,
  Booking,
  City,
  Dealer,
  DealerEnquiry,
  DealerQuotation,
  Manufacturer,
  NotificationRow,
  PurchaseIntent,
  QuotationLineItem,
  SaleVerification,
  Vehicle,
  VehicleImage,
  VehicleVariant,
} from "@/lib/types";

export interface MembershipWithBatch {
  id: string;
  status: string;
  eligibility: string;
  joined_at: string;
  batch: Batch & {
    city: City;
    variant: VehicleVariant & { vehicle: Vehicle & { manufacturer: Manufacturer; images: VehicleImage[] } };
  };
}

const MEMBERSHIP_SELECT =
  "id, status, eligibility, joined_at, batch:batches(*, city:cities(*), variant:vehicle_variants(*, vehicle:vehicles(*, manufacturer:manufacturers(*), images:vehicle_images(*))))";

/** All reads below run as the signed-in user; RLS limits them to their own rows. */
export async function getMyMemberships(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("batch_memberships")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MembershipWithBatch[];
}

export async function getMyDashboardSummary(userId: string) {
  const supabase = await createClient();
  const [intents, quotes, enquiries, notifications] = await Promise.all([
    supabase.from("purchase_intent_confirmations").select("*").eq("user_id", userId),
    supabase.from("dealer_quotations").select("id, batch_id").eq("status", "published"),
    supabase.from("dealer_enquiries").select("id, status").eq("user_id", userId),
    supabase.from("notifications").select("*").eq("user_id", userId).eq("channel", "in_app").order("created_at", { ascending: false }).limit(8),
  ]);
  return {
    intents: (intents.data ?? []) as PurchaseIntent[],
    publishedQuotes: (quotes.data ?? []) as { id: string; batch_id: string }[],
    enquiries: (enquiries.data ?? []) as Pick<DealerEnquiry, "id" | "status">[],
    notifications: (notifications.data ?? []) as NotificationRow[],
  };
}

export type QuoteForCustomer = DealerQuotation & {
  dealer: Pick<Dealer, "id" | "name" | "branch_address" | "contact_person" | "business_email" | "business_phone" | "is_demo"> | null;
  line_items: QuotationLineItem[];
};

export async function getMyGroupDetail(userId: string, batchId: string) {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("batch_memberships")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .eq("batch_id", batchId)
    .maybeSingle();
  if (!membership) return null;

  const [intent, quotes, enquiries, bookings, sales] = await Promise.all([
    supabase.from("purchase_intent_confirmations").select("*").eq("batch_id", batchId).eq("user_id", userId).maybeSingle(),
    supabase
      .from("dealer_quotations")
      .select("*, dealer:dealers(id, name, branch_address, contact_person, business_email, business_phone, is_demo), line_items:quotation_line_items(*)")
      .eq("batch_id", batchId)
      .in("status", ["published", "expired", "withdrawn"])
      .order("total_payable"),
    supabase.from("dealer_enquiries").select("*").eq("batch_id", batchId).eq("user_id", userId),
    supabase.from("bookings").select("*").eq("batch_id", batchId).eq("user_id", userId),
    supabase.from("sale_verifications").select("*").eq("batch_id", batchId).eq("user_id", userId),
  ]);

  return {
    membership: membership as unknown as MembershipWithBatch,
    intent: (intent.data as PurchaseIntent | null) ?? null,
    quotes: (quotes.data ?? []) as QuoteForCustomer[],
    enquiries: (enquiries.data ?? []) as DealerEnquiry[],
    bookings: (bookings.data ?? []) as Booking[],
    sales: (sales.data ?? []) as SaleVerification[],
  };
}

export async function getMyNotifications(userId: string, page = 1) {
  const supabase = await createClient();
  const size = 20;
  const { data, count } = await supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  return { items: (data ?? []) as NotificationRow[], total: count ?? 0, pageCount: Math.max(1, Math.ceil((count ?? 0) / size)) };
}
