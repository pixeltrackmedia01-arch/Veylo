import type { CommissionAgreement, CommissionCalcType, Money } from "@/lib/types";
import { toNumber } from "@/lib/types";

type AgreementLike = Pick<
  CommissionAgreement,
  | "id"
  | "dealer_id"
  | "manufacturer_id"
  | "vehicle_id"
  | "variant_id"
  | "batch_id"
  | "status"
  | "effective_from"
  | "effective_to"
  | "created_at"
>;

export interface SaleContext {
  dealerId: string;
  batchId: string;
  variantId: string;
  vehicleId: string;
  manufacturerId: string;
  saleDate: string; // YYYY-MM-DD
}

/** Specificity weights — mirror public.find_commission_agreement(). */
export function agreementSpecificity(a: AgreementLike) {
  return (
    (a.dealer_id ? 32 : 0) +
    (a.batch_id ? 16 : 0) +
    (a.variant_id ? 8 : 0) +
    (a.vehicle_id ? 4 : 0) +
    (a.manufacturer_id ? 2 : 0)
  );
}

export function agreementApplies(a: AgreementLike, sale: SaleContext) {
  return (
    a.status === "active" &&
    a.effective_from <= sale.saleDate &&
    (!a.effective_to || a.effective_to >= sale.saleDate) &&
    (!a.dealer_id || a.dealer_id === sale.dealerId) &&
    (!a.batch_id || a.batch_id === sale.batchId) &&
    (!a.variant_id || a.variant_id === sale.variantId) &&
    (!a.vehicle_id || a.vehicle_id === sale.vehicleId) &&
    (!a.manufacturer_id || a.manufacturer_id === sale.manufacturerId)
  );
}

/** Selects the agreement the database would apply (for previews and tests). */
export function selectAgreement<T extends AgreementLike>(agreements: T[], sale: SaleContext): T | null {
  const candidates = agreements.filter((a) => agreementApplies(a, sale));
  candidates.sort(
    (x, y) =>
      agreementSpecificity(y) - agreementSpecificity(x) ||
      y.effective_from.localeCompare(x.effective_from) ||
      y.created_at.localeCompare(x.created_at),
  );
  return candidates[0] ?? null;
}

export interface CommissionTerms {
  calc_type: CommissionCalcType;
  fixed_amount: Money | null;
  percentage: Money | null;
  cap_amount: Money | null;
}

/**
 * Mirrors public.calculate_commission_amount(). Percentage agreements need an
 * explicit basis amount — commission is never derived from the vehicle price
 * implicitly.
 */
export function calculateCommission(terms: CommissionTerms, basisAmount: number | null): number {
  let amount: number;
  if (terms.calc_type === "fixed") {
    amount = toNumber(terms.fixed_amount);
  } else {
    if (basisAmount === null || !Number.isFinite(basisAmount) || basisAmount < 0) {
      throw new Error("basis_amount_required");
    }
    amount = Math.round(basisAmount * toNumber(terms.percentage)) / 100;
  }
  if (terms.cap_amount !== null && terms.cap_amount !== undefined && terms.cap_amount !== "") {
    amount = Math.min(amount, toNumber(terms.cap_amount));
  }
  return Math.round(amount * 100) / 100;
}

export const COMMISSION_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["invoiced", "payable", "disputed", "cancelled"],
  invoiced: ["payable", "paid", "disputed", "cancelled"],
  payable: ["paid", "disputed", "cancelled"],
  disputed: ["pending", "invoiced", "payable", "cancelled"],
  paid: [],
  cancelled: [],
};
