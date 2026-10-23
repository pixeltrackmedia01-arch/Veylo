export const FUEL_LABELS: Record<string, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  cng: "CNG",
  petrol_cng: "CNG",
  electric: "Electric",
  hybrid: "Hybrid",
};

export const TRANSMISSION_LABELS: Record<string, string> = {
  manual: "Manual",
  automatic: "Automatic",
  amt: "AMT",
  cvt: "CVT",
  dct: "DCT",
  not_applicable: "—",
};

/** Buyer-facing body groups; compact SUVs are shown as SUVs. */
export const BODY_LABELS: Record<string, string> = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  suv: "SUV",
  compact_suv: "SUV",
  muv: "MUV",
  coupe: "Coupe",
  convertible: "Convertible",
  pickup: "Pickup",
  minivan: "Minivan",
  scooter: "Scooter",
  motorcycle: "Motorcycle",
};

export function bodyGroup(body: string | null | undefined) {
  if (!body) return null;
  return body === "compact_suv" ? "suv" : body;
}

/** Filter value for fuel: CNG covers petrol+CNG variants. */
export function fuelGroup(fuel: string | null | undefined) {
  if (!fuel) return null;
  return fuel === "petrol_cng" ? "cng" : fuel;
}

/** Manual vs automatic family (AMT, CVT and DCT are automatics). */
export function transmissionGroup(t: string | null | undefined) {
  if (!t || t === "not_applicable") return null;
  return t === "manual" ? "manual" : "automatic";
}

export const fuelLabel = (f: string | null | undefined) => (f ? (FUEL_LABELS[f] ?? f) : "—");
export const transmissionLabel = (t: string | null | undefined) => (t ? (TRANSMISSION_LABELS[t] ?? t) : "—");
export const bodyLabel = (b: string | null | undefined) => (b ? (BODY_LABELS[b] ?? b) : "—");
