import "server-only";

import { cache } from "react";
import { siteConfig } from "@/config/site";
import { ACTIVE_PUBLIC_STATUSES, progressPercent } from "@/lib/domain/batch-lifecycle";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  Batch,
  City,
  Faq,
  Manufacturer,
  Vehicle,
  VehicleCategory,
  VehicleImage,
  VehiclePrice,
  VehicleVariant,
} from "@/lib/types";
import { toNumber } from "@/lib/types";
import { mergeSetting } from "@/lib/settings";

export interface VehicleWithRelations extends Vehicle {
  manufacturer: Manufacturer;
  variants: VehicleVariant[];
  images: VehicleImage[];
}

export interface CatalogueVehicle extends VehicleWithRelations {
  prices: VehiclePrice[];
  batches: Batch[];
  activeBatchCount: number;
  openBatchCount: number;
  totalVerified: number;
  bestProgress: number;
  newestBatchAt: string | null;
  lowestExShowroom: number | null;
  isDemoPricing: boolean;
}

export interface CatalogueFilters {
  q?: string;
  category?: VehicleCategory;
  manufacturer?: string;
  fuel?: string;
  transmission?: string;
  body?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "popularity" | "newest" | "progress";
  page?: number;
}

export const PAGE_SIZE = 12;

const VEHICLE_SELECT = "*, manufacturer:manufacturers(*), variants:vehicle_variants(*), images:vehicle_images(*)";

export const getLaunchCity = cache(async (): Promise<City | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("cities").select("*").eq("slug", siteConfig.launchCity.slug).maybeSingle();
  return (data as City | null) ?? null;
});

export const getActiveCities = cache(async (): Promise<City[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("cities").select("*").eq("is_active", true).order("name");
  return (data ?? []) as City[];
});

function sortVariants(v: VehicleWithRelations) {
  v.variants = (v.variants ?? []).filter((x) => x.status === "published").sort((a, b) => a.sort_order - b.sort_order);
  v.images = (v.images ?? []).sort((a, b) => a.sort_order - b.sort_order);
  return v;
}

/** Published vehicles enriched with current prices and active batch stats. */
export const getCatalogue = cache(async (): Promise<CatalogueVehicle[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const city = await getLaunchCity();

  const [vehiclesRes, batchesRes, pricesRes] = await Promise.all([
    supabase.from("vehicles").select(VEHICLE_SELECT).eq("status", "published").order("model_name"),
    supabase
      .from("batches")
      .select("*")
      .in("status", ACTIVE_PUBLIC_STATUSES as string[])
      .order("created_at", { ascending: false }),
    city
      ? supabase.from("vehicle_prices").select("*").eq("is_current", true).eq("city_id", city.id)
      : Promise.resolve({ data: [] as VehiclePrice[], error: null }),
  ]);
  if (vehiclesRes.error) throw vehiclesRes.error;

  const batches = (batchesRes.data ?? []) as Batch[];
  const prices = (pricesRes.data ?? []) as VehiclePrice[];

  return ((vehiclesRes.data ?? []) as VehicleWithRelations[]).map((raw) => {
    const v = sortVariants(raw);
    const variantIds = new Set(v.variants.map((x) => x.id));
    const vBatches = batches.filter((b) => variantIds.has(b.variant_id));
    const vPrices = prices.filter((p) => variantIds.has(p.variant_id));
    const open = vBatches.filter((b) => b.status === "open");
    const exShowroom = vPrices.map((p) => toNumber(p.ex_showroom)).filter((n) => n > 0);
    return {
      ...v,
      prices: vPrices,
      batches: vBatches,
      activeBatchCount: vBatches.length,
      openBatchCount: open.length,
      totalVerified: vBatches.reduce((sum, b) => sum + b.verified_participant_count, 0),
      bestProgress: open.reduce((m, b) => Math.max(m, progressPercent(b)), 0),
      newestBatchAt: vBatches[0]?.created_at ?? null,
      lowestExShowroom: exShowroom.length ? Math.min(...exShowroom) : null,
      isDemoPricing: vPrices.some((p) => p.is_demo),
    };
  });
});

export async function searchCatalogue(filters: CatalogueFilters) {
  const all = await getCatalogue();
  const q = filters.q?.trim().toLowerCase();
  let items = all.filter((v) => {
    if (filters.category && v.category !== filters.category) return false;
    if (filters.manufacturer && v.manufacturer.slug !== filters.manufacturer) return false;
    if (filters.body && v.body_type !== filters.body) return false;
    if (filters.fuel && !v.variants.some((x) => x.fuel_type === filters.fuel)) return false;
    if (filters.transmission && !v.variants.some((x) => x.transmission === filters.transmission)) return false;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      // Price filters only match vehicles with a reference price on record.
      if (v.lowestExShowroom === null) return false;
      if (filters.minPrice !== undefined && v.lowestExShowroom < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && v.lowestExShowroom > filters.maxPrice) return false;
    }
    if (q) {
      const haystack = `${v.manufacturer.name} ${v.model_name} ${v.variants.map((x) => x.name).join(" ")}`.toLowerCase();
      if (!q.split(/\s+/).every((term) => haystack.includes(term))) return false;
    }
    return true;
  });

  const sort = filters.sort ?? "popularity";
  items = [...items].sort((a, b) => {
    if (sort === "newest") return (b.newestBatchAt ?? "").localeCompare(a.newestBatchAt ?? "");
    if (sort === "progress") return b.bestProgress - a.bestProgress;
    return b.totalVerified - a.totalVerified || b.openBatchCount - a.openBatchCount;
  });

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  return { items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total, page, pageCount, all };
}

export function facetOptions(all: CatalogueVehicle[]) {
  const uniq = (values: (string | null | undefined)[]) => [...new Set(values.filter((v): v is string => Boolean(v)))].sort();
  return {
    manufacturers: [...new Map(all.map((v) => [v.manufacturer.slug, v.manufacturer.name])).entries()].sort((a, b) =>
      a[1].localeCompare(b[1]),
    ),
    fuels: uniq(all.flatMap((v) => v.variants.map((x) => x.fuel_type))),
    transmissions: uniq(all.flatMap((v) => v.variants.map((x) => x.transmission))),
    bodies: uniq(all.map((v) => v.body_type)),
  };
}

export const getVehicleBySlug = cache(async (slug: string) => {
  const all = await getCatalogue();
  return all.find((v) => v.slug === slug) ?? null;
});

export interface BatchWithVehicle extends Batch {
  variant: VehicleVariant & { vehicle: Vehicle & { manufacturer: Manufacturer; images: VehicleImage[] } };
  city: City;
}

const BATCH_SELECT =
  "*, city:cities(*), variant:vehicle_variants(*, vehicle:vehicles(*, manufacturer:manufacturers(*), images:vehicle_images(*)))";

export async function listPublicBatches(opts: { status?: "open" | "active"; limit?: number; category?: VehicleCategory } = {}) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let query = supabase
    .from("batches")
    .select(BATCH_SELECT)
    .in("status", opts.status === "open" ? ["open"] : (ACTIVE_PUBLIC_STATUSES as string[]))
    .order("deadline", { ascending: true });
  if (opts.limit) query = query.limit(opts.limit * 3);
  const { data, error } = await query;
  if (error) throw error;
  let rows = ((data ?? []) as BatchWithVehicle[]).filter((b) => b.variant?.vehicle?.status === "published");
  if (opts.category) rows = rows.filter((b) => b.variant.vehicle.category === opts.category);
  return opts.limit ? rows.slice(0, opts.limit) : rows;
}

export const getBatchBySlug = cache(async (slug: string): Promise<BatchWithVehicle | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("batches").select(BATCH_SELECT).eq("slug", slug).maybeSingle();
  const batch = data as BatchWithVehicle | null;
  if (!batch || batch.variant?.vehicle?.status !== "published") return null;
  return batch;
});

export async function getCurrentPrice(variantId: string, cityId: string): Promise<VehiclePrice | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicle_prices")
    .select("*")
    .eq("variant_id", variantId)
    .eq("city_id", cityId)
    .eq("is_current", true)
    .maybeSingle();
  return (data as VehiclePrice | null) ?? null;
}

export const getFaqs = cache(async (category?: string): Promise<Faq[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let query = supabase.from("faqs").select("*").eq("is_published", true).is("vehicle_id", null).order("sort_order");
  if (category) query = query.eq("category", category);
  const { data } = await query;
  return (data ?? []) as Faq[];
});

/** Admin-written questions attached to one vehicle. */
export const getVehicleFaqs = cache(async (vehicleId: string): Promise<Faq[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("faqs").select("*").eq("is_published", true).eq("vehicle_id", vehicleId).order("sort_order");
  return (data ?? []) as Faq[];
});

export const getPublicSetting = cache(async <T,>(key: string, fallback: T): Promise<T> => {
  if (!isSupabaseConfigured()) return fallback;
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).eq("is_public", true).maybeSingle();
  if (!data || data.value === null || data.value === undefined) return fallback;
  return mergeSetting(fallback, data.value) as T;
});

export const getContentPage = cache(async (slug: string) => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("content_pages").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  return data as import("@/lib/types").ContentPage | null;
});

export async function getPlatformStats() {
  const catalogue = await getCatalogue();
  const batches = catalogue.flatMap((v) => v.batches);
  return {
    vehicles: catalogue.length,
    openGroups: batches.filter((b) => b.status === "open").length,
    verifiedParticipants: batches.filter((b) => b.status === "open").reduce((s, b) => s + b.verified_participant_count, 0),
  };
}
