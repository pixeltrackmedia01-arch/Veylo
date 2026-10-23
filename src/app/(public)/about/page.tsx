import type { Metadata } from "next";
import { ContentPageView } from "@/components/shared/content-page";
import { DEFAULT_PAGES } from "@/content/pages";

export const metadata: Metadata = {
  title: DEFAULT_PAGES["about"].title,
  description: DEFAULT_PAGES["about"].summary,
  alternates: { canonical: "/about" },
};

export default function Page() {
  return <ContentPageView slug="about" />;
}
