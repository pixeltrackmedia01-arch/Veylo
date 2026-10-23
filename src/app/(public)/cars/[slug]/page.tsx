import { CalendarClock, ChevronRight, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CarCard } from "@/components/cars/car-card";
import { CarDetailBody, type DetailVariant, LeadCard, MobileActionBar, SectionCard, SectionNav } from "@/components/cars/car-detail";
import { CarGallery, ColourPicker, type GallerySlide } from "@/components/cars/car-gallery";
import { CompareToggle } from "@/components/cars/compare-toggle";
import { CompareTray } from "@/components/cars/compare-tray";
import { SaveCarButton } from "@/components/cars/save-car-button";
import { FaqList } from "@/components/faq/faq-list";
import { JsonLd } from "@/components/faq/json-ld";
import { BrandMark } from "@/components/home/brand-tile";
import { vehicleImageUrl } from "@/components/shared/vehicle-image";
import { Progress } from "@/components/ui/progress";
import { brandForManufacturer } from "@/config/brands";
import { siteConfig } from "@/config/site";
import { getViewer } from "@/lib/auth/session";
import { carFaqItems } from "@/lib/car-faqs";
import { getVehicleFaqs, listPublicBatches } from "@/lib/data/catalogue";
import { getCarBySlug, getCars, getSavedVehicleIds } from "@/lib/data/cars";
import { spotsLeft } from "@/lib/domain/batch-lifecycle";
import { bodyGroup } from "@/lib/domain/car-labels";
import { faqJsonLd, toFaqItems } from "@/lib/faq";
import { formatDate, formatPriceLakh, timeRemaining } from "@/lib/format";
import { toNumber } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const car = await getCarBySlug((await params).slug);
  if (!car) return { title: "Car not found" };
  const name = `${car.manufacturer.name} ${car.model_name}`;
  return {
    title: `${name} price in ${siteConfig.launchCity.name}, specs, mileage & EMI`,
    description: `${name}${car.fromPrice ? ` from ${formatPriceLakh(car.fromPrice)}` : ""}: variant prices, on-road estimate, specifications, features, colours, EMI and group deals in ${siteConfig.launchCity.name}.`,
    alternates: { canonical: `/cars/${car.slug}` },
  };
}

const SECTIONS = [
  { id: "photos", label: "Photos" },
  { id: "colours", label: "Colours" },
  { id: "price", label: "Price" },
  { id: "on-road", label: "On-road price" },
  { id: "specs", label: "Specifications" },
  { id: "features", label: "Features" },
  { id: "emi", label: "EMI" },
  { id: "warranty", label: "Warranty" },
  { id: "questions", label: "Questions" },
];

export default async function CarPage({ params }: Params) {
  const { slug } = await params;
  const car = await getCarBySlug(slug);
  if (!car) notFound();
  const viewer = await getViewer();
  const city = siteConfig.launchCity.name;
  const name = `${car.manufacturer.name} ${car.model_name}`;

  const [batches, adminFaqs, allCars, saved] = await Promise.all([
    listPublicBatches({ status: "open" }),
    getVehicleFaqs(car.id),
    getCars(),
    getSavedVehicleIds(viewer?.id),
  ]);
  const groups = batches
    .filter((b) => b.variant.vehicle.id === car.id)
    .sort((a, b) => b.verified_participant_count / b.target_participants - a.verified_participant_count / a.target_participants);
  const group = groups[0] ?? null;

  const variants: DetailVariant[] = car.variantsWithPrice.map((v) => ({
    id: v.id,
    name: v.name,
    fuel: v.fuel_type,
    transmission: v.transmission,
    engineCc: v.engine_cc,
    specs: v.specifications ?? {},
    features: v.features ?? {},
    exShowroom: v.exShowroom,
    roadTax: v.price ? toNumber(v.price.registration_road_tax) : null,
    insurance: v.price ? toNumber(v.price.insurance) : null,
    otherCharges: v.price ? toNumber(v.price.other_charges) + toNumber(v.price.accessories) + toNumber(v.price.extended_warranty) : null,
    onRoad: v.onRoad,
    priceKind: v.price?.price_kind ?? null,
    priceSource: v.price?.source ?? null,
    priceVerifiedAt: v.price?.verified_at ?? null,
  }));

  const photos = car.images.filter((i) => !i.is_placeholder);
  const slides: GallerySlide[] = photos.length
    ? photos.map((p) => ({ kind: "photo" as const, url: vehicleImageUrl(p) ?? "", alt: p.alt_text })).filter((s) => s.url)
    : (car.colours ?? []).map((colour) => ({ kind: "art" as const, colour }));
  if (!slides.length) slides.push({ kind: "art", colour: { name: "Red", hex: "#c8102e" } });

  const faqItems = [...toFaqItems(adminFaqs), ...carFaqItems(car, groups.length, city)];
  const similar = allCars
    .filter((c) => c.id !== car.id && bodyGroup(c.body_type) === bodyGroup(car.body_type))
    .sort((a, b) => Math.abs((a.fromPrice ?? 0) - (car.fromPrice ?? 0)) - Math.abs((b.fromPrice ?? 0) - (car.fromPrice ?? 0)))
    .slice(0, 3);
  const brand = brandForManufacturer(car.manufacturer.slug);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name,
    brand: { "@type": "Brand", name: car.manufacturer.name },
    description: car.summary ?? car.description ?? undefined,
    vehicleConfiguration: car.body_type ?? undefined,
    offers:
      car.fromPrice && car.toPrice
        ? { "@type": "AggregateOffer", priceCurrency: "INR", lowPrice: car.fromPrice, highPrice: car.toPrice, offerCount: variants.length }
        : undefined,
  };

  return (
    <div className="bg-surface pb-28 lg:pb-16">
      <JsonLd data={productLd} />
      <JsonLd data={faqJsonLd(faqItems)} />
      <div className="container-page pt-5">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <Link href="/cars" className="hover:text-primary">New Cars</Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <Link href={`/cars?brand=${car.manufacturer.slug}`} className="hover:text-primary">{car.manufacturer.name}</Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="text-ink">{car.model_name}</span>
        </nav>

        <header className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            {brand ? (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm">
                <BrandMark brand={brand} className="h-8 w-10 sm:h-8 sm:w-10" />
              </span>
            ) : null}
            <div>
              <h1 className="text-2xl font-extrabold sm:text-4xl">{name}</h1>
              <p className="mt-1 text-lg">
                <span className="font-extrabold text-primary">
                  {formatPriceLakh(car.fromPrice)}
                  {car.toPrice && car.toPrice !== car.fromPrice ? ` – ${formatPriceLakh(car.toPrice)}` : ""}
                </span>
                <span className="ml-2 text-xs font-medium text-muted-foreground">*Ex-showroom, {city} (indicative)</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SaveCarButton vehicleId={car.id} name={name} initialSaved={saved.has(car.id)} signedIn={Boolean(viewer)} className="size-10" />
            <CompareToggle slug={car.slug} name={name} withLabel />
          </div>
        </header>
      </div>

      <div className="container-page mt-4">
        <SectionNav sections={SECTIONS} />
      </div>

      <div className="container-page mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <section id="photos" className="scroll-mt-32 rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
            <CarGallery slides={slides} body={car.body_type} name={name} />
          </section>

          {car.colours?.length ? (
            <SectionCard id="colours" title={`${car.model_name} Colours`} action={<span className="text-sm text-muted-foreground">{car.colours.length} colours</span>}>
              <ColourPicker colours={car.colours} body={car.body_type} name={name} />
            </SectionCard>
          ) : null}

          <CarDetailBody
            car={{ id: car.id, name, model: car.model_name, body: car.body_type, summary: car.summary ?? car.description }}
            variants={variants}
            city={city}
          />

          <SectionCard id="warranty" title={`${car.model_name} Warranty`}>
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <ShieldCheck className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-ink">{car.warranty ?? "Standard manufacturer warranty"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Extended warranty and service packages are sold by the dealership. Coverage terms are set by {car.manufacturer.name}; check the
                  warranty booklet at delivery.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="questions" title={`${car.model_name} Questions & Answers`}>
            <FaqList items={faqItems} className="-my-2" />
          </SectionCard>

          {similar.length ? (
            <section aria-labelledby="similar-heading">
              <h2 id="similar-heading" className="mb-4 text-lg font-bold sm:text-xl">
                Similar cars
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {similar.map((c) => (
                  <CarCard key={c.id} car={c} saved={saved.has(c.id)} signedIn={Boolean(viewer)} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          {group ? (
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50 to-white p-5 shadow-[var(--shadow-card)]">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                {car.manufacturer.name} group deal open in {group.city.name}
              </p>
              <p className="mt-2 font-semibold text-ink">
                {car.model_name} {group.variant.name}
                {group.is_demo ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Demo</span> : null}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground/80">
                <Users className="size-4 text-emerald-600" aria-hidden="true" />
                {group.verified_participant_count} of {group.target_participants} buyers joined · {spotsLeft(group)} spots left
              </p>
              <Progress value={group.verified_participant_count} max={group.target_participants} label="Group progress" className="mt-2" />
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="size-3.5" aria-hidden="true" /> Closes {formatDate(group.deadline)} · {timeRemaining(group.deadline)}
              </p>
              <Link
                href={`/groups/${group.slug}`}
                className="mt-4 flex h-11 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                Join the Group
              </Link>
              <p className="mt-2 text-center text-xs text-muted-foreground">Free to join · no obligation to buy</p>
            </div>
          ) : (
            <div className="rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)]">
              <p className="font-bold text-ink">No group open for the {car.model_name} yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask for the best price below and we&apos;ll tell you when a group opens in {city}.
              </p>
              <Link href="/groups" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
                See all open groups →
              </Link>
            </div>
          )}
          <LeadCard carId={car.id} model={name} />
        </aside>
      </div>

      <MobileActionBar carId={car.id} model={name} groupHref={group ? `/groups/${group.slug}` : null} fromPrice={car.fromPrice} />
      <CompareTray names={Object.fromEntries(allCars.map((c) => [c.slug, `${c.manufacturer.name} ${c.model_name}`]))} />
    </div>
  );
}
