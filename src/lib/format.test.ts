import { describe, expect, it } from "vitest";
import { formatINR, formatINRCompact, timeRemaining, todayInIndia } from "./format";
import { safeRedirectPath, slugify } from "./utils";

describe("INR formatting", () => {
  it("uses the Indian numbering system", () => {
    expect(formatINR(1234567)).toBe("₹12,34,567");
    expect(formatINR("850000")).toBe("₹8,50,000");
    expect(formatINR(99.5)).toBe("₹99.50");
  });

  it("handles empty values", () => {
    expect(formatINR(null)).toBe("—");
    expect(formatINR("abc")).toBe("—");
  });

  it("formats lakh and crore", () => {
    expect(formatINRCompact(750000)).toBe("₹7.5 lakh");
    expect(formatINRCompact(12500000)).toBe("₹1.25 crore");
  });
});

describe("dates", () => {
  it("uses India's date for 'today'", () => {
    expect(todayInIndia(new Date("2026-10-22T20:00:00Z"))).toBe("2026-10-23");
  });

  it("describes remaining time", () => {
    const now = new Date("2026-10-23T00:00:00Z");
    expect(timeRemaining("2026-10-22T00:00:00Z", now)).toBe("Deadline passed");
    expect(timeRemaining("2026-10-23T05:00:00Z", now)).toBe("5 hours left");
    expect(timeRemaining("2026-10-30T00:00:00Z", now)).toBe("7 days left");
  });
});

describe("utils", () => {
  it("slugifies", () => {
    expect(slugify("Maruti Suzuki Swift — VXi (AMT)")).toBe("maruti-suzuki-swift-vxi-amt");
  });

  it("blocks open redirects", () => {
    expect(safeRedirectPath("/dashboard/groups/1")).toBe("/dashboard/groups/1");
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
  });
});
