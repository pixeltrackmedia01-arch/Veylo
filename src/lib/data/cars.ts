import "server-only";

import { type CatalogueVehicle, getCatalogue } from "@/lib/data/catalogue";
import { type CarFilters, matchesCar, sortCars } from "@/lib/domain/car-filters";
import { defaultEmiFor } from "@/lib/emi";
import { createClient } from "@/lib/supabase/server";
import type { VehiclePrice, VehicleVariant } from "@/lib/types";
import { toNumber } from "@/lib/types";

export interface VariantWithPrice extends VehicleVariant {
  price: VehiclePrice | null;
  exShowroom: number | null;
  onRoad: number | null;
}

export interface CarSummary extends CatalogueVehicle {
  variantsWithPrice: VariantWithPrice[];
  baseVariant: VariantWithPrice | null;
  fromPrice: number | null;
  fromOnRoad: number | null;
  toPrice: number | null;
  emiFrom: number | null;
  bestMileage: number | null;
  primaryColour: string | null;
}

/** Highest numeric "kmpl" figure across variants, for mileage sorting. */
function bestKmpl(variants: VehicleVariant[]) {
  const values = variants
    .map((v) => String(v.specifications?.["Mileage"] ?? ""))
    .filter((m) => m.includes("kmpl"))
    .map((m) => parseFloat(m))
    .filter((n) => Number.isFinite(n));
  return values.length ? Math.max(...values) : null;
}

export function toCarSummary(v: CatalogueVehicle): CarSummary {
  const variantsWithPrice = v.variants.map((variant) => {
    const price = v.prices.find((p) => p.variant_id === variant.id) ?? null;
    return {
      ...variant,
      price,
      exShowroom: price ? toNumber(price.ex_showroom) : null,
      onRoad: price ? toNumber(price.on_road_total) : null,
    };
  });
  const priced = variantsWithPrice.filter((x) => x.exShowroom !== null).sort((a, b) => a.exShowroom! - b.exShowroom!);
  const base = priced[0] ?? variantsWithPrice[0] ?? null;
  const fromPrice = priced[0]?.exShowroom ?? null;
  return {
    ...v,
    variantsWithPrice,
    baseVariant: base,
    fromPrice,
    fromOnRoad: priced[0]?.onRoad ?? null,
    toPrice: priced.at(-1)?.exShowroom ?? null,
    emiFrom: priced[0]?.onRoad ? defaultEmiFor(priced[0].onRoad) : fromPrice ? defaultEmiFor(fromPrice) : null,
    bestMileage: bestKmpl(v.variants),
    primaryColour: v.colours?.[0]?.hex ?? null,
  };
}

export async function getCars() {
  const all = await getCatalogue();
  return all.filter((v) => v.category === "car").map(toCarSummary);
}

export async function getCarBySlug(slug: string) {
  const cars = await getCars();
  return cars.find((c) => c.slug === slug) ?? null;
}

export async function searchCars(f: CarFilters) {
  const all = await getCars();
  return { all, items: sortCars(all.filter((c) => matchesCar(c, f)), f.sort) };
}

/** Vehicle ids the signed-in user has saved (empty when signed out). */
export async function getSavedVehicleIds(userId: string | null | undefined) {
  if (!userId) return new Set<string>();
  const supabase = await createClient();
  const { data } = await supabase.from("saved_vehicles").select("vehicle_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.vehicle_id as string));
}
