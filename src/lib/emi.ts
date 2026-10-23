import { siteConfig } from "@/config/site";

export interface EmiInput {
  /** Loan principal in rupees. */
  principal: number;
  /** Annual interest rate, in percent (e.g. 9.5). */
  annualRatePct: number;
  tenureMonths: number;
}

/** Monthly instalment: P·r·(1+r)^n / ((1+r)^n − 1), with r the monthly rate. Whole rupees. */
export function monthlyEmi({ principal, annualRatePct, tenureMonths }: EmiInput) {
  if (!(principal > 0) || !(tenureMonths > 0)) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return Math.round(principal / tenureMonths);
  const f = Math.pow(1 + r, tenureMonths);
  return Math.round((principal * r * f) / (f - 1));
}

export function emiSummary(input: EmiInput) {
  const emi = monthlyEmi(input);
  const totalPayable = emi * input.tenureMonths;
  return { emi, totalPayable, totalInterest: Math.max(0, totalPayable - Math.round(input.principal)) };
}

/** Year-by-year principal/interest split and closing balance. */
export function amortisationByYear(input: EmiInput) {
  const r = input.annualRatePct / 12 / 100;
  const emi = monthlyEmi(input);
  const rows: { year: number; principal: number; interest: number; balance: number }[] = [];
  let balance = input.principal;
  for (let m = 1; m <= input.tenureMonths && balance > 0; m++) {
    const interest = balance * r;
    // The EMI is rounded to whole rupees, so the last instalment settles whatever remains.
    const principal = m === input.tenureMonths ? balance : Math.min(balance, emi - interest);
    balance = Math.max(0, balance - principal);
    const year = Math.ceil(m / 12);
    const row = rows[year - 1] ?? (rows[year - 1] = { year, principal: 0, interest: 0, balance: 0 });
    row.principal += principal;
    row.interest += interest;
    row.balance = balance;
  }
  return rows.map((row) => ({
    year: row.year,
    principal: Math.round(row.principal),
    interest: Math.round(row.interest),
    balance: Math.round(row.balance),
  }));
}

/** "EMI from ₹…/mo" estimate using the site's default down payment, rate and tenure. */
export function defaultEmiFor(price: number) {
  const { annualRatePct, tenureMonths, downPaymentPct } = siteConfig.emi;
  return monthlyEmi({ principal: price * (1 - downPaymentPct / 100), annualRatePct, tenureMonths });
}
