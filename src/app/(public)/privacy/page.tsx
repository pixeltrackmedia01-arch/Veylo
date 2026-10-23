import type { Metadata } from "next";
import { ContentPageView } from "@/components/shared/content-page";
import { DEFAULT_PAGES } from "@/content/pages";

export const metadata: Metadata = {
  title: DEFAULT_PAGES["privacy"].title,
  description: DEFAULT_PAGES["privacy"].summary,
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <ContentPageView slug="privacy" />;
}
