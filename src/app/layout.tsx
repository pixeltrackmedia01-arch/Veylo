import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import type { CSSProperties } from "react";
import { Toaster } from "@/components/shared/toaster";
import { siteConfig } from "@/config/site";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const display = Plus_Jakarta_Sans({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: `${siteConfig.name} — ${siteConfig.tagline} in Surat`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_IN",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: siteConfig.colors.ink,
  width: "device-width",
  initialScale: 1,
};

const brandVars = {
  "--brand-primary": siteConfig.colors.primary,
  "--brand-primary-hover": siteConfig.colors.primaryHover,
  "--brand-primary-foreground": siteConfig.colors.primaryForeground,
  "--brand-ink": siteConfig.colors.ink,
  "--brand-accent-soft": siteConfig.colors.accentSoft,
} as CSSProperties;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${body.variable} ${display.variable}`} style={brandVars}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-[100] rounded-md bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
