import { ArrowRight, CalendarClock, Info, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VehicleCard } from "@/components/catalogue/vehicle-card";
import { BatchStatusBadge, DemoBadge } from "@/components/shared/status-badge";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCatalogue, getFaqs, getVehicleBySlug } from "@/lib/data/catalogue";
import { isSupabaseConfigured } from "@/lib/env";
import { LINE_ITEM_LABELS } from "@/lib/domain/pricing";
import { formatDate, formatINR, timeRemaining } from "@/lib/format";
import { toNumber } from "@/lib/types";
import { titleCase } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSupabaseConfigured()) return {};
  const { slug } = await params;
  const v = await getVehicleBySlug(slug);
  if (!v) return { title: "Vehicle not found" };
  const title = `${v.manufacturer.name} ${v.model_name} group buying in Surat`;
  const description = `Join a free buyer group for the ${v.manufacturer.name} ${v.model_name} in Surat. Itemised dealer quotations are reviewed before they are shown.`;
  return { title, description, alternates: { canonical: `/vehicles/${v.slug}` }, openGraph: { title, description } };
}

const PRICE_ROWS = [
  ["ex_showroom", LINE_ITEM_LABELS.ex_showroom],
  ["registration_road_tax", LINE_ITEM_LABELS.registration_road_tax],
  ["insurance", LINE_ITEM_LABELS.insurance],
  ["accessories", LINE_ITEM_LABELS.accessories],
  ["extended_warranty", LINE_ITEM_LABELS.extended_warranty],
  ["other_charges", LINE_ITEM_LABELS.other_charge],
] as const;

export default async function VehiclePage({ params }: Props) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) notFound();
  const [catalogue, faqs] = await Promise.all([getCatalogue(), getFaqs()]);
  const related = catalogue.filter((v) => v.category === vehicle.category && v.id !== vehicle.id).slice(0, 3);
  const name = `${vehicle.manufacturer.name} ${vehicle.model_name}`;

  const jsonLd = vehicle.is_demo
    ? null
    : {
        "@context": "https://schema.org",
        "@type": vehicle.category === "car" ? "Car" : "Product",
        name,
        brand: { "@type": "Brand", name: vehicle.manufacturer.name },
        category: vehicle.category === "car" ? "Car" : "Two-wheeler",
        model: vehicle.model_name,
      };

  return (
    <div className="pb-16">
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      ) : null}

      <section className="border-b bg-gradient-to-b from-accent/50 to-white">
        <div className="container-page grid gap-10 py-10 lg:grid-cols-2 lg:py-14">
          <div className="space-y-5">
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
              <Link href="/vehicles" className="hover:text-ink">Vehicles</Link> /{" "}
              <Link href={`/vehicles?category=${vehicle.category}`} className="hover:text-ink">
                {vehicle.category === "car" ? "Cars" : "Two-wheelers"}
              </Link>
            </nav>
            <div className="flex flex-wrap gap-2">
              {vehicle.body_type ? <Badge variant="outline">{titleCase(vehicle.body_type)}</Badge> : null}
              {vehicle.is_demo ? <DemoBadge /> : null}
            </div>
            <div>
              <p className="text-lg text-muted-foreground">{vehicle.manufacturer.name}</p>
              <h1 className="text-4xl font-extrabold sm:text-5xl">{vehicle.model_name}</h1>
            </div>
            {vehicle.description ? <p className="max-w-xl text-lg leading-8 text-foreground/75">{vehicle.description}</p> : null}
            {vehicle.highlights.length ? (
              <ul className="flex flex-wrap gap-2">
                {vehicle.highlights.map((h) => (
                  <li key={h} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-ink shadow-sm">
                    {h}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <a href="#groups">
                  See open groups <ArrowRight aria-hidden="true" />
                </a>
              </Button>
              <p className="self-center text-sm text-muted-foreground">Joining is free · No obligation</p>
            </div>
          </div>
          <div className="space-y-3">
            <VehicleImage
              image={vehicle.images[0]}
              category={vehicle.category}
              bodyType={vehicle.body_type}
              alt={name}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[16/10] rounded-3xl border bg-white shadow-[var(--shadow-card)]"
            />
            {vehicle.images.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {vehicle.images.slice(1, 5).map((img) => (
                  <VehicleImage key={img.id} image={img} category={vehicle.category} alt={img.alt_text} className="aspect-square rounded-xl border" sizes="25vw" />
                ))}
              </div>
            ) : null}
            {vehicle.images[0]?.attribution ? (
              <p className="text-xs text-muted-foreground">Image: {vehicle.images[0].attribution}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section id="groups" className="container-page scroll-mt-20 py-12" aria-labelledby="variants-heading">
        <h2 id="variants-heading" className="text-2xl font-bold sm:text-3xl">
          Variants, reference prices and groups
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Each group is tied to one exact variant. Reference prices are indicative and shown with their source and verification
          date; dealers confirm the final on-road price, offers, stock, financing, insurance, registration and delivery.
        </p>

        <div className="mt-8 space-y-6">
          {vehicle.variants.map((variant) => {
            const price = vehicle.prices.find((p) => p.variant_id === variant.id);
            const groups = vehicle.batches.filter((b) => b.variant_id === variant.id);
            const specs = Object.entries(variant.specifications ?? {});
            return (
              <article key={variant.id} className="overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-card)]">
                <div className="flex flex-col gap-2 border-b bg-surface px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl font-bold">{variant.name}</h3>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {variant.fuel_type ? <Badge variant="outline">{titleCase(variant.fuel_type)}</Badge> : null}
                    {variant.transmission ? (
                      <Badge variant="outline">
                        {variant.transmission.length <= 3 ? variant.transmission.toUpperCase() : titleCase(variant.transmission)}
                      </Badge>
                    ) : null}
                    {variant.engine_cc ? <Badge variant="outline">{variant.engine_cc} cc</Badge> : null}
                  </div>
                </div>
                <div className="grid gap-8 p-6 lg:grid-cols-3">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">Specifications</h4>
                    {specs.length ? (
                      <dl className="mt-3 space-y-2 text-sm">
                        {specs.map(([k, val]) => (
                          <div key={k} className="flex justify-between gap-4 border-b border-dashed pb-2">
                            <dt className="text-muted-foreground">{k}</dt>
                            <dd className="font-medium text-ink">{String(val)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">Specifications not yet verified.</p>
                    )}
                    {variant.specs_source ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Source: {variant.specs_source}
                        {variant.specs_verified_at ? ` · checked ${formatDate(variant.specs_verified_at)}` : ""}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">Indicative price in Surat</h4>
                    {price ? (
                      <>
                        <dl className="mt-3 space-y-2 text-sm">
                          {PRICE_ROWS.filter(([k]) => toNumber(price[k]) > 0).map(([k, label]) => (
                            <div key={k} className="flex justify-between gap-4">
                              <dt className="text-muted-foreground">{label}</dt>
                              <dd className="tabular-nums">{formatINR(price[k])}</dd>
                            </div>
                          ))}
                          <div className="flex justify-between gap-4 border-t pt-2 font-semibold text-ink">
                            <dt>Indicative on-road total</dt>
                            <dd className="tabular-nums">{formatINR(price.on_road_total)}</dd>
                          </div>
                        </dl>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {price.price_kind === "verified" ? "Verified with a dealer" : "Indicative"} · Source: {price.source} ·
                          Checked {formatDate(price.verified_at)}
                          {price.valid_until ? ` · valid until ${formatDate(price.valid_until)}` : ""}
                        </p>
                        {price.is_demo ? <DemoBadge className="mt-2" /> : null}
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        We have not verified a reference price for this variant yet. Dealers will quote after a group closes.
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">Groups for this variant</h4>
                    {groups.length ? (
                      <ul className="mt-3 space-y-3">
                        {groups.map((b) => (
                          <li key={b.id}>
                            <Link href={`/groups/${b.slug}`} className="block rounded-xl border p-4 transition-colors hover:border-primary/50 hover:bg-accent/30">
                              <div className="flex items-center justify-between gap-2">
                                <BatchStatusBadge status={b.status} />
                                {b.status === "open" ? (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarClock className="size-3.5" aria-hidden="true" /> {timeRemaining(b.deadline)}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
                                <Users className="size-4 text-primary" aria-hidden="true" />
                                {b.verified_participant_count} of {b.target_participants} verified participants
                              </p>
                              <Progress className="mt-2" size="sm" value={b.verified_participant_count} max={b.target_participants} label={`${b.title} progress`} />
                              <p className="mt-2 text-xs text-muted-foreground">Closes {formatDate(b.deadline)}</p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No active group for this variant yet. <Link href="/contact" className="font-semibold text-primary">Tell us you&apos;re interested</Link>.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <Alert variant="info" className="mt-8" title="Important">
          Participation is free and does not guarantee a discount or a vehicle. Reference prices are indicative. The final
          on-road price, offers, stock, financing, insurance, registration and delivery are confirmed by the dealership, and
          you purchase directly from the dealership.
        </Alert>
      </section>

      {faqs.length ? (
        <section className="container-page py-6" aria-labelledby="vehicle-faq">
          <h2 id="vehicle-faq" className="text-2xl font-bold">
            Questions about group buying
          </h2>
          <Accordion type="single" collapsible className="mt-4 rounded-2xl border bg-white px-6">
            {faqs.slice(0, 5).map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ) : null}

      {related.length ? (
        <section className="container-page py-12" aria-labelledby="related-heading">
          <h2 id="related-heading" className="flex items-center gap-2 text-2xl font-bold">
            <Info className="size-5 text-primary" aria-hidden="true" /> Related vehicles
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
