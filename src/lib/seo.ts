import { siteConfig } from "@/config/site";
import { getSiteUrl } from "@/lib/env";
import { formatPriceLakh } from "@/lib/format";

/** Model year used in titles ("2026 price"), the way car portals keep titles fresh. */
export const SEO_YEAR = new Date().getFullYear();

export const absoluteUrl = (path: string) => `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;

export type Crumb = { name: string; path: string };

/** schema.org BreadcrumbList for the visible breadcrumb trail. */
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: getSiteUrl(),
    logo: absoluteUrl("/favicon.ico"),
    description: siteConfig.description,
    ...(siteConfig.contact.email ? { email: siteConfig.contact.email } : {}),
  };
}

/** WebSite with a sitelinks search box pointing at the new-car search. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: getSiteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/cars")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

const priceRange = (from: number | null | undefined, to: number | null | undefined) =>
  from ? `${formatPriceLakh(from)}${to && to !== from ? ` – ${formatPriceLakh(to)}` : ""}` : null;

/** "Maruti Suzuki Brezza Price 2026, Mileage, Specs, Images & Variants" */
export function modelTitle(name: string) {
  return `${name} Price ${SEO_YEAR}, Mileage, Specs, Images & Variants`;
}

export function modelDescription(opts: {
  name: string;
  from?: number | null;
  to?: number | null;
  variants?: number;
  fuels?: string[];
  kind?: string;
}) {
  const range = priceRange(opts.from, opts.to);
  const parts = [
    `${opts.name} price starts at ${range ? range.split(" – ")[0] : "—"}${range?.includes("–") ? ` and goes up to ${range.split(" – ")[1]}` : ""} (ex-showroom).`,
    opts.variants ? `Available in ${opts.variants} variant${opts.variants === 1 ? "" : "s"}${opts.fuels?.length ? ` with ${opts.fuels.join(", ")} options` : ""}.` : "",
    `Check on-road price, mileage, specifications, features, colours, EMI and group-buying offers.`,
  ];
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 300);
}

export function brandTitle(brand: string, kind: "Cars" | "Bikes & Scooters") {
  return `${brand} ${kind} Price List ${SEO_YEAR} in India — New Models, Mileage & Specs`;
}

export function brandDescription(brand: string, kind: string, count: number, from?: number | null, to?: number | null) {
  const range = priceRange(from, to);
  return `${brand} has ${count} ${kind.toLowerCase()} on sale in India${range ? `, priced from ${range}` : ""} (ex-showroom). Compare variants, mileage, specs, features and EMI, and join a group deal for a better price.`;
}
