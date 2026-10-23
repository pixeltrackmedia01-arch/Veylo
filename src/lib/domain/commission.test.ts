import { describe, expect, it } from "vitest";
import { calculateCommission, selectAgreement, type SaleContext } from "./commission";

const sale: SaleContext = {
  dealerId: "d1",
  batchId: "b1",
  variantId: "vv1",
  vehicleId: "v1",
  manufacturerId: "m1",
  saleDate: "2026-10-20",
};

const agreement = (over: Partial<Parameters<typeof selectAgreement>[0][number]> & { id: string }) => ({
  dealer_id: null,
  manufacturer_id: null,
  vehicle_id: null,
  variant_id: null,
  batch_id: null,
  status: "active" as const,
  effective_from: "2026-01-01",
  effective_to: null,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("agreement selection", () => {
  it("prefers dealer-specific over general agreements", () => {
    const picked = selectAgreement(
      [agreement({ id: "general", variant_id: "vv1" }), agreement({ id: "dealer", dealer_id: "d1" })],
      sale,
    );
    expect(picked?.id).toBe("dealer");
  });

  it("prefers campaign (batch) scope within the same dealer", () => {
    const picked = selectAgreement(
      [agreement({ id: "dealer", dealer_id: "d1" }), agreement({ id: "campaign", dealer_id: "d1", batch_id: "b1" })],
      sale,
    );
    expect(picked?.id).toBe("campaign");
  });

  it("ignores inactive, expired, future and other-dealer agreements", () => {
    const picked = selectAgreement(
      [
        agreement({ id: "inactive", dealer_id: "d1", status: "inactive" }),
        agreement({ id: "expired", dealer_id: "d1", effective_to: "2026-06-30" }),
        agreement({ id: "future", dealer_id: "d1", effective_from: "2026-12-01" }),
        agreement({ id: "other", dealer_id: "d2" }),
      ],
      sale,
    );
    expect(picked).toBeNull();
  });

  it("breaks ties by latest effective date", () => {
    const picked = selectAgreement(
      [agreement({ id: "old", dealer_id: "d1", effective_from: "2026-01-01" }), agreement({ id: "new", dealer_id: "d1", effective_from: "2026-07-01" })],
      sale,
    );
    expect(picked?.id).toBe("new");
  });
});

describe("commission calculation", () => {
  it("uses the fixed amount for fixed agreements", () => {
    expect(calculateCommission({ calc_type: "fixed", fixed_amount: 5000, percentage: null, cap_amount: null }, null)).toBe(5000);
  });

  it("applies the percentage to the explicit basis amount", () => {
    expect(calculateCommission({ calc_type: "percentage", fixed_amount: null, percentage: "0.75", cap_amount: null }, 800000)).toBe(6000);
  });

  it("requires a basis amount for percentage agreements", () => {
    expect(() => calculateCommission({ calc_type: "percentage", fixed_amount: null, percentage: 1, cap_amount: null }, null)).toThrow(
      "basis_amount_required",
    );
  });

  it("applies caps", () => {
    expect(calculateCommission({ calc_type: "percentage", fixed_amount: null, percentage: 2, cap_amount: 10000 }, 1000000)).toBe(10000);
  });

  it("rounds to paise", () => {
    expect(calculateCommission({ calc_type: "percentage", fixed_amount: null, percentage: 0.333, cap_amount: null }, 123457)).toBe(411.11);
  });
});
