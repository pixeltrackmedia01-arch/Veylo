import type { LineItemCategory, Money } from "@/lib/types";
import { toNumber } from "@/lib/types";

export const LINE_ITEM_LABELS: Record<LineItemCategory, string> = {
  ex_showroom: "Ex-showroom price",
  registration_road_tax: "Registration & road tax",
  insurance: "Insurance",
  accessories: "Accessories",
  extended_warranty: "Extended warranty",
  other_charge: "Other charges",
  discount: "Discount / offer",
};

export const LINE_ITEM_ORDER: LineItemCategory[] = [
  "ex_showroom",
  "registration_road_tax",
  "insurance",
  "accessories",
  "extended_warranty",
  "other_charge",
  "discount",
];

export interface LineItemLike {
  category: LineItemCategory;
  amount: Money;
  is_included: boolean;
}

export interface QuoteTotals {
  charges: number;
  discounts: number;
  payable: number;
  excluded: number;
  byCategory: Partial<Record<LineItemCategory, number>>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Mirrors public.recalculate_quotation_totals(). Amounts are always positive; discounts subtract. */
export function computeQuoteTotals(items: LineItemLike[]): QuoteTotals {
  let charges = 0;
  let discounts = 0;
  let excluded = 0;
  const byCategory: Partial<Record<LineItemCategory, number>> = {};
  for (const item of items) {
    const amount = toNumber(item.amount);
    if (amount < 0) throw new Error("Line item amounts must not be negative");
    if (!item.is_included) {
      excluded += amount;
      continue;
    }
    byCategory[item.category] = round2((byCategory[item.category] ?? 0) + amount);
    if (item.category === "discount") discounts += amount;
    else charges += amount;
  }
  return {
    charges: round2(charges),
    discounts: round2(discounts),
    payable: round2(charges - discounts),
    excluded: round2(excluded),
    byCategory,
  };
}

export interface PriceComponents {
  ex_showroom: Money;
  registration_road_tax: Money;
  insurance: Money;
  accessories: Money;
  extended_warranty: Money;
  other_charges: Money;
}

export function priceTotal(p: PriceComponents) {
  return round2(
    toNumber(p.ex_showroom) +
      toNumber(p.registration_road_tax) +
      toNumber(p.insurance) +
      toNumber(p.accessories) +
      toNumber(p.extended_warranty) +
      toNumber(p.other_charges),
  );
}

export interface ReferencePriceInput extends PriceComponents {
  variant_id: string;
  city_id: string;
  verified_at: string; // YYYY-MM-DD
  valid_until: string | null;
  is_current: boolean;
  is_demo: boolean;
}

export interface QuoteInput {
  variant_id: string;
  city_id: string;
  status: string;
  valid_until: string | null;
  published_at: string | null;
  is_demo: boolean;
  items: LineItemLike[];
}

export type SavingsResult =
  | { comparable: true; reference: number; quoted: number; saving: number; percent: number; isDemo: boolean }
  | { comparable: false; reason: string };

/** A reference price older than this is treated as outdated. */
export const MAX_REFERENCE_AGE_DAYS = 90;

const COMPONENT_MAP: { key: keyof PriceComponents; category: LineItemCategory }[] = [
  { key: "ex_showroom", category: "ex_showroom" },
  { key: "registration_road_tax", category: "registration_road_tax" },
  { key: "insurance", category: "insurance" },
  { key: "accessories", category: "accessories" },
  { key: "extended_warranty", category: "extended_warranty" },
  { key: "other_charges", category: "other_charge" },
];

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
}

/**
 * Savings are shown only for like-for-like comparisons: same variant and city,
 * a current and recent verified reference price, a published and still-valid
 * quotation, and the same set of charge components on both sides. Anything
 * else returns `comparable: false` with the reason, and the UI shows no saving.
 */
export function computeSavings(reference: ReferencePriceInput | null, quote: QuoteInput, today: string): SavingsResult {
  if (!reference) return { comparable: false, reason: "No verified reference price for this variant and city." };
  if (reference.variant_id !== quote.variant_id) return { comparable: false, reason: "Reference price is for a different variant." };
  if (reference.city_id !== quote.city_id) return { comparable: false, reason: "Reference price is for a different city." };
  if (!reference.is_current) return { comparable: false, reason: "Reference price is not current." };
  if (reference.valid_until && reference.valid_until < today) return { comparable: false, reason: "Reference price has expired." };
  if (daysBetween(reference.verified_at, today) > MAX_REFERENCE_AGE_DAYS) {
    return { comparable: false, reason: "Reference price is outdated." };
  }
  if (quote.status !== "published" || !quote.published_at) return { comparable: false, reason: "Quotation is not published." };
  if (!quote.valid_until || quote.valid_until < today) return { comparable: false, reason: "Quotation is no longer valid." };
  if (reference.is_demo !== quote.is_demo) return { comparable: false, reason: "Demo and real data cannot be compared." };

  const totals = computeQuoteTotals(quote.items);
  let referenceTotal = 0;
  let quotedTotal = 0;
  for (const { key, category } of COMPONENT_MAP) {
    const refAmount = toNumber(reference[key]);
    const quoteAmount = totals.byCategory[category];
    if (refAmount > 0 && quoteAmount === undefined) {
      return { comparable: false, reason: `Quotation does not include ${LINE_ITEM_LABELS[category].toLowerCase()}.` };
    }
    if (refAmount === 0 && quoteAmount !== undefined && quoteAmount > 0) {
      return { comparable: false, reason: `Reference price does not include ${LINE_ITEM_LABELS[category].toLowerCase()}.` };
    }
    referenceTotal += refAmount;
    quotedTotal += quoteAmount ?? 0;
  }
  quotedTotal -= totals.discounts;

  const saving = round2(referenceTotal - quotedTotal);
  if (saving <= 0) return { comparable: false, reason: "The quotation is not below the verified reference price." };
  return {
    comparable: true,
    reference: round2(referenceTotal),
    quoted: round2(quotedTotal),
    saving,
    percent: Math.round((saving / referenceTotal) * 1000) / 10,
    isDemo: reference.is_demo,
  };
}
