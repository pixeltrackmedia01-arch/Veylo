import { describe, expect, it } from "vitest";
import type { CarSummary } from "@/lib/data/cars";
import { activeFilterCount, carsHref, matchesCar, parseFilters, sortCars, toggleValue } from "./car-filters";

function car(overrides: Partial<CarSummary> & { fuels?: string[]; trans?: string[] }): CarSummary {
  const { fuels = ["petrol"], trans = ["manual"], ...rest } = overrides;
  return {
    id: "id",
    slug: "slug",
    model_name: "Model",
    body_type: "hatchback",
    popularity: 0,
    totalVerified: 0,
    published_at: "2026-01-01",
    manufacturer: { id: "m", name: "Maker", slug: "maker", categories: ["car"], website_url: null, is_active: true },
    variants: fuels.map((f, i) => ({ name: `V${i}`, fuel_type: f, transmission: trans[i] ?? trans[0] })),
    fromPrice: 700000,
    bestMileage: 20,
    ...rest,
  } as unknown as CarSummary;
}

describe("parseFilters / carsHref", () => {
  it("reads comma-separated lists and round-trips to a URL", () => {
    const f = parseFilters({ brand: "tata-motors,kia", budget: ["5-10"], sort: "price_asc", q: " nexon " });
    expect(f).toMatchObject({ brand: ["tata-motors", "kia"], budget: ["5-10"], sort: "price_asc", q: "nexon" });
    expect(carsHref(f)).toBe("/cars?q=nexon&brand=tata-motors%2Ckia&budget=5-10&sort=price_asc");
    expect(activeFilterCount(f)).toBe(4);
  });

  it("falls back to popularity for unknown sorts and toggles values", () => {
    const f = parseFilters({ sort: "nope", body: "suv" });
    expect(f.sort).toBe("popularity");
    expect(toggleValue(f, "body", "suv")).toBe("/cars");
    expect(toggleValue(f, "body", "sedan")).toBe("/cars?body=suv%2Csedan");
  });
});

describe("matchesCar", () => {
  const empty = parseFilters({});

  it("matches budget bands on the starting price", () => {
    expect(matchesCar(car({ fromPrice: 499000 }), { ...empty, budget: ["u5"] })).toBe(true);
    expect(matchesCar(car({ fromPrice: 500000 }), { ...empty, budget: ["u5"] })).toBe(false);
    expect(matchesCar(car({ fromPrice: 500000 }), { ...empty, budget: ["u5", "5-10"] })).toBe(true);
    expect(matchesCar(car({ fromPrice: null }), { ...empty, budget: ["u5"] })).toBe(false);
  });

  it("groups compact SUVs with SUVs, petrol+CNG with CNG and AMT/CVT/DCT with automatic", () => {
    expect(matchesCar(car({ body_type: "compact_suv" }), { ...empty, body: ["suv"] })).toBe(true);
    expect(matchesCar(car({ fuels: ["petrol_cng"] }), { ...empty, fuel: ["cng"] })).toBe(true);
    expect(matchesCar(car({ trans: ["amt"] }), { ...empty, trans: ["automatic"] })).toBe(true);
    expect(matchesCar(car({ trans: ["manual"] }), { ...empty, trans: ["automatic"] })).toBe(false);
  });

  it("searches brand, model and variant names", () => {
    const c = car({ model_name: "Nexon", manufacturer: { name: "Tata Motors", slug: "tata-motors" } as CarSummary["manufacturer"] });
    expect(matchesCar(c, { ...empty, q: "tata nexon" })).toBe(true);
    expect(matchesCar(c, { ...empty, q: "creta" })).toBe(false);
  });
});

describe("sortCars", () => {
  it("sorts by price and puts unpriced cars last", () => {
    const list = [car({ slug: "b", fromPrice: 900000 }), car({ slug: "none", fromPrice: null }), car({ slug: "a", fromPrice: 500000 })];
    expect(sortCars(list, "price_asc").map((c) => c.slug)).toEqual(["a", "b", "none"]);
    expect(sortCars(list, "price_desc").map((c) => c.slug)).toEqual(["b", "a", "none"]);
  });
});
