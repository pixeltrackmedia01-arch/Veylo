import { describe, expect, it } from "vitest";
import { computeQuoteTotals, computeSavings, priceTotal, type QuoteInput, type ReferencePriceInput } from "./pricing";

const today = "2026-10-23";

const reference: ReferencePriceInput = {
  variant_id: "v1",
  city_id: "c1",
  ex_showroom: 700000,
  registration_road_tax: 45000,
  insurance: 35000,
  accessories: 0,
  extended_warranty: 0,
  other_charges: 0,
  verified_at: "2026-10-01",
  valid_until: "2026-12-31",
  is_current: true,
  is_demo: false,
};

const quote: QuoteInput = {
  variant_id: "v1",
  city_id: "c1",
  status: "published",
  valid_until: "2026-11-15",
  published_at: "2026-10-20T10:00:00Z",
  is_demo: false,
  items: [
    { category: "ex_showroom", amount: 700000, is_included: true },
    { category: "registration_road_tax", amount: 45000, is_included: true },
    { category: "insurance", amount: 30000, is_included: true },
    { category: "accessories", amount: 12000, is_included: false },
    { category: "discount", amount: 10000, is_included: true },
  ],
};

describe("quotation totals", () => {
  it("adds included charges, subtracts discounts and reports excluded items separately", () => {
    const totals = computeQuoteTotals(quote.items);
    expect(totals.charges).toBe(775000);
    expect(totals.discounts).toBe(10000);
    expect(totals.payable).toBe(765000);
    expect(totals.excluded).toBe(12000);
  });

  it("handles paise without floating point drift", () => {
    const totals = computeQuoteTotals([
      { category: "ex_showroom", amount: "0.10", is_included: true },
      { category: "insurance", amount: "0.20", is_included: true },
    ]);
    expect(totals.payable).toBe(0.3);
  });

  it("rejects negative amounts", () => {
    expect(() => computeQuoteTotals([{ category: "ex_showroom", amount: -1, is_included: true }])).toThrow();
  });

  it("sums reference price components", () => {
    expect(priceTotal(reference)).toBe(780000);
  });
});

describe("savings", () => {
  it("shows a saving for a like-for-like, current comparison", () => {
    const result = computeSavings(reference, quote, today);
    expect(result).toEqual({ comparable: true, reference: 780000, quoted: 765000, saving: 15000, percent: 1.9, isDemo: false });
  });

  it("never compares different variants", () => {
    expect(computeSavings({ ...reference, variant_id: "v2" }, quote, today).comparable).toBe(false);
  });

  it("never compares different cities", () => {
    expect(computeSavings({ ...reference, city_id: "c2" }, quote, today).comparable).toBe(false);
  });

  it("rejects outdated or expired reference prices", () => {
    expect(computeSavings({ ...reference, verified_at: "2026-05-01" }, quote, today).comparable).toBe(false);
    expect(computeSavings({ ...reference, valid_until: "2026-10-01" }, quote, today).comparable).toBe(false);
    expect(computeSavings({ ...reference, is_current: false }, quote, today).comparable).toBe(false);
  });

  it("requires a published, valid quotation", () => {
    expect(computeSavings(reference, { ...quote, status: "approved" }, today).comparable).toBe(false);
    expect(computeSavings(reference, { ...quote, valid_until: "2026-10-01" }, today).comparable).toBe(false);
  });

  it("refuses incomparable offers with missing or extra components", () => {
    const noInsurance = { ...quote, items: quote.items.filter((i) => i.category !== "insurance") };
    expect(computeSavings(reference, noInsurance, today)).toMatchObject({ comparable: false });
    const withWarranty = { ...quote, items: [...quote.items, { category: "extended_warranty" as const, amount: 5000, is_included: true }] };
    expect(computeSavings(reference, withWarranty, today)).toMatchObject({ comparable: false });
  });

  it("does not report a saving when the quote is not cheaper", () => {
    const pricey = { ...quote, items: quote.items.filter((i) => i.category !== "discount").concat({ category: "insurance", amount: 20000, is_included: true }) };
    expect(computeSavings(reference, pricey, today).comparable).toBe(false);
  });

  it("does not compare demo data with real data", () => {
    expect(computeSavings({ ...reference, is_demo: true }, quote, today).comparable).toBe(false);
  });

  it("requires a reference price", () => {
    expect(computeSavings(null, quote, today).comparable).toBe(false);
  });
});
