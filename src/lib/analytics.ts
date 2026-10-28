/**
 * Google Tag Manager dataLayer helpers. Events are pushed only from the
 * browser; when no container is configured the pushes are harmless no-ops.
 * Never put personal data (name, phone, email) in an event.
 */
import type { LeadKind } from "@/lib/types";

type DataLayerEvent = { event: string } & Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

export function getGtmId(): string | null {
  const id = process.env.NEXT_PUBLIC_GTM_ID?.trim().toUpperCase();
  return id && /^GTM-[A-Z0-9]+$/.test(id) ? id : null;
}

export function pushDataLayer(event: DataLayerEvent) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(event);
}

/** Primary conversion: a lead form (on-road price, test drive, …) was submitted successfully. */
export function trackLead(lead: { kind: LeadKind; vehicleId?: string; variantId?: string; label?: string }) {
  pushDataLayer({
    event: "generate_lead",
    lead_type: lead.kind,
    vehicle_id: lead.vehicleId ?? null,
    variant_id: lead.variantId ?? null,
    vehicle_label: lead.label ?? null,
    page_path: window.location.pathname,
  });
}
