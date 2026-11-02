/** One comparison column: a car and, optionally, the chosen variant. */
export type ComparePick = { slug: string; variant?: string };

/** `/compare?cars=creta,seltos&v=sx-turbo,` — variants line up with cars; blank = base variant. */
export function compareHref(picks: ComparePick[]) {
  if (!picks.length) return "/compare";
  const cars = picks.map((p) => p.slug).join(",");
  const v = picks.map((p) => p.variant ?? "").join(",");
  return `/compare?cars=${cars}${v.replace(/,/g, "") ? `&v=${v}` : ""}`;
}
