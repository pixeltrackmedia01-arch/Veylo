import { describe, expect, it } from "vitest";
import { amortisationByYear, defaultEmiFor, emiSummary, monthlyEmi } from "@/lib/emi";

describe("monthlyEmi", () => {
  it("matches the standard reducing-balance formula", () => {
    // ₹5,00,000 at 9.5% for 60 months ≈ ₹10,501/month.
    expect(monthlyEmi({ principal: 500000, annualRatePct: 9.5, tenureMonths: 60 })).toBe(10501);
  });

  it("handles a zero interest rate", () => {
    expect(monthlyEmi({ principal: 120000, annualRatePct: 0, tenureMonths: 12 })).toBe(10000);
  });

  it("returns 0 for an empty loan", () => {
    expect(monthlyEmi({ principal: 0, annualRatePct: 9, tenureMonths: 60 })).toBe(0);
  });
});

describe("emiSummary and amortisation", () => {
  it("total payable equals EMI × tenure and interest is the difference", () => {
    const s = emiSummary({ principal: 800000, annualRatePct: 9.5, tenureMonths: 60 });
    expect(s.totalPayable).toBe(s.emi * 60);
    expect(s.totalInterest).toBe(s.totalPayable - 800000);
  });

  it("pays the loan off by the final year", () => {
    const rows = amortisationByYear({ principal: 800000, annualRatePct: 9.5, tenureMonths: 60 });
    expect(rows).toHaveLength(5);
    expect(rows.at(-1)?.balance).toBeLessThanOrEqual(1);
    const principal = rows.reduce((n, r) => n + r.principal, 0);
    expect(Math.abs(principal - 800000)).toBeLessThanOrEqual(5);
  });

  it("uses the site defaults for card estimates (20% down, 9.5%, 5 years)", () => {
    expect(defaultEmiFor(625000)).toBe(monthlyEmi({ principal: 500000, annualRatePct: 9.5, tenureMonths: 60 }));
  });
});
