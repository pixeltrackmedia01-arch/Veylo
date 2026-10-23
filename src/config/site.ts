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
    primary: "#0f9f78",
    primaryHover: "#0b8564",
    primaryForeground: "#ffffff",
    ink: "#0c1b33",
    accentSoft: "#e7f6f1",
  },
  defaultBatchTarget: 20,
} as const;

export type SiteConfig = typeof siteConfig;
