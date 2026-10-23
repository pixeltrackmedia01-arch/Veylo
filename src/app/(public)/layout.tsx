import { SiteFooter } from "@/components/layout/site-footer";
import { OfferTicker } from "@/components/layout/offer-ticker";
import { SiteHeader } from "@/components/layout/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfferTicker />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
