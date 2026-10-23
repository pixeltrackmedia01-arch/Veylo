import type { Metadata } from "next";
import { ContentPageView } from "@/components/shared/content-page";
import { DEFAULT_PAGES } from "@/content/pages";

export const metadata: Metadata = {
  title: DEFAULT_PAGES["disclaimer"].title,
  description: DEFAULT_PAGES["disclaimer"].summary,
  alternates: { canonical: "/disclaimer" },
};

export default function Page() {
  return <ContentPageView slug="disclaimer" />;
}
