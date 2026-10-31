import { SiteFooter } from "@/components/layout/site-footer";
import { OfferTicker } from "@/components/layout/offer-ticker";
import { SiteHeader } from "@/components/layout/site-header";
import { JsonLd } from "@/components/faq/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <OfferTicker />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
