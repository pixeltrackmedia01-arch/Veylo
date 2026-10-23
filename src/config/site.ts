/**
 * Central brand configuration. Change the name, contact details, colours and
 * launch city here; everything else in the UI reads from this file.
 * Contact details can also be overridden at runtime from Admin → Content
 * (app_settings.contact.public).
 */
export const siteConfig = {
  name: "GroupDrive",
  shortName: "GroupDrive",
  tagline: "Group buying for cars and two-wheelers",
  description:
    "Join a free buyer group for the exact vehicle model and variant you want in Surat. When the group closes, we request itemised quotations from authorised dealerships and review them before you see them.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  launchCity: { name: "Surat", slug: "surat", state: "Gujarat" },
  contact: {
    email: "hello@example.com",
    phone: "",
    address: "Surat, Gujarat, India",
    hours: "Mon–Sat, 10:00–18:00 IST",
  },
  legalEntity: "GroupDrive (legal entity name to be confirmed)",
  // Brand colours are applied as CSS variables in the root layout.
  colors: {
    primary: "#e11d2e",
    primaryHover: "#c41626",
    primaryForeground: "#ffffff",
    ink: "#111827",
    accentSoft: "#fdecee",
  },
  defaultBatchTarget: 20,
  // Default assumptions for EMI estimates (cards, car pages, EMI calculator).
  emi: { annualRatePct: 9.5, tenureMonths: 60, downPaymentPct: 20 },
  // Hero savings badge. The footnote must stay alongside any savings figure.
  savings: {
    badge: "Save up to ₹20,000 – ₹60,000*",
    footnote:
      "*Estimated saving per car based on group negotiations; the actual amount depends on the car, the dealer and how many buyers join. Savings are not guaranteed.",
  },
} as const;

export type SiteConfig = typeof siteConfig;
