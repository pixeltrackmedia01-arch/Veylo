import type { Metadata } from "next";
import { ContentPageView } from "@/components/shared/content-page";
import { DEFAULT_PAGES } from "@/content/pages";

export const metadata: Metadata = {
  title: DEFAULT_PAGES["terms"].title,
  description: DEFAULT_PAGES["terms"].summary,
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <ContentPageView slug="terms" />;
}
