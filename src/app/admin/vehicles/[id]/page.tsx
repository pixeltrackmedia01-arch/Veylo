import { ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageUploadForm, PriceForm, VariantForm, VehicleForm } from "@/components/admin/catalogue-forms";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteVehicleImageAction, retirePriceAction, setVehicleStatusAction } from "@/lib/actions/admin-catalogue";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatINR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { City, Vehicle, VehicleImage as Img, VehiclePrice, VehicleVariant } from "@/lib/types";

export default async function AdminVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("vehicles").select("*, variants:vehicle_variants(*), images:vehicle_images(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const vehicle = data as Vehicle & { variants: VehicleVariant[]; images: Img[] };
  vehicle.variants.sort((a, b) => a.sort_order - b.sort_order);
  vehicle.images.sort((a, b) => a.sort_order - b.sort_order);
  const variantIds = vehicle.variants.map((v) => v.id);
  const [{ data: manufacturers }, { data: cities }, { data: prices }] = await Promise.all([
    supabase.from("manufacturers").select("id, name").order("name"),
    supabase.from("cities").select("*").order("name"),
    variantIds.length
      ? supabase.from("vehicle_prices").select("*").in("variant_id", variantIds).order("verified_at", { ascending: false })
      : Promise.resolve({ data: [] as VehiclePrice[] }),
  ]);
  const cityName = (cid: string) => (cities as City[] | null)?.find((c) => c.id === cid)?.name ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/admin/vehicles">← Vehicles</Link>}
        title={vehicle.model_name}
        description={<span className="flex flex-wrap items-center gap-2"><StatusBadge status={vehicle.status} />{vehicle.is_demo ? <DemoBadge /> : null}</span>}
        actions={
          <>
            {vehicle.status !== "published" ? (
              <ActionButton action={setVehicleStatusAction.bind(null, vehicle.id, "published")}>Publish</ActionButton>
            ) : (
              <ActionButton variant="outline" action={setVehicleStatusAction.bind(null, vehicle.id, "unpublished")} confirm={{ title: "Unpublish this vehicle?", description: "It will disappear from the public catalogue." }}>
                Unpublish
              </ActionButton>
            )}
            {vehicle.status !== "archived" ? (
              <ActionButton variant="ghost" action={setVehicleStatusAction.bind(null, vehicle.id, "archived")} confirm={{ title: "Archive this vehicle?", destructive: true, confirmLabel: "Archive" }}>
                Archive
              </ActionButton>
            ) : null}
            {vehicle.status === "published" ? (
              <Button asChild variant="ghost"><Link href={`/vehicles/${vehicle.slug}`} target="_blank">View <ExternalLink aria-hidden="true" /></Link></Button>
            ) : null}
          </>
        }
      />

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <VehicleForm
            id={vehicle.id}
            manufacturers={manufacturers ?? []}
            defaults={{
              manufacturerId: vehicle.manufacturer_id,
              modelName: vehicle.model_name,
              slug: vehicle.slug,
              category: vehicle.category,
              bodyType: vehicle.body_type ?? "",
              description: vehicle.description ?? "",
              highlights: vehicle.highlights.join("\n"),
              summary: vehicle.summary ?? "",
              colours: (vehicle.colours ?? []).map((c) => `${c.name} ${c.hex}`).join("\n"),
              warranty: vehicle.warranty ?? "",
              popularity: vehicle.popularity ?? 0,
              isDemo: vehicle.is_demo,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Variants</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {vehicle.variants.map((v) => (
            <details key={v.id} className="rounded-xl border p-4">
              <summary className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
                {v.name} <StatusBadge status={v.status} />
              </summary>
              <div className="mt-4">
                <VariantForm
                  id={v.id}
                  defaults={{
                    vehicleId: vehicle.id,
                    name: v.name,
                    slug: v.slug,
                    fuelType: (v.fuel_type as never) ?? null,
                    transmission: (v.transmission as never) ?? null,
                    engineCc: v.engine_cc,
                    specifications: Object.entries(v.specifications ?? {}).map(([k, val]) => `${k}: ${val}`).join("\n"),
                    features: Object.entries(v.features ?? {}).map(([k, items]) => `${k}: ${items.join("; ")}`).join("\n"),
                    specsSource: v.specs_source ?? "",
                    specsVerifiedAt: v.specs_verified_at ?? "",
                    sortOrder: v.sort_order,
                    status: v.status,
                  }}
                />
              </div>
            </details>
          ))}
          <details className="rounded-xl border border-dashed p-4" open={vehicle.variants.length === 0}>
            <summary className="cursor-pointer font-semibold text-primary">Add a variant</summary>
            <div className="mt-4">
              <VariantForm id={null} defaults={{ vehicleId: vehicle.id, name: "", slug: "", fuelType: null, transmission: null, engineCc: null, specifications: "", features: "", specsSource: "", specsVerifiedAt: "", sortOrder: vehicle.variants.length, status: "draft" }} />
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reference prices</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Every price needs a source and verification date. Recording a new price retires the previous one for that variant and city
            (kept in history). Customers see savings only against current, recent, like-for-like references.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant / city</TableHead>
                <TableHead>Ex-showroom</TableHead>
                <TableHead>On-road</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {((prices ?? []) as VehiclePrice[]).map((p) => (
                <TableRow key={p.id} className={p.is_current ? "" : "opacity-60"}>
                  <TableCell>
                    {vehicle.variants.find((v) => v.id === p.variant_id)?.name} · {cityName(p.city_id)}
                    <div className="mt-1 flex gap-1">
                      <StatusBadge status={p.is_current ? "active" : "inactive"} label={p.is_current ? "Current" : "History"} />
                      {p.is_demo ? <DemoBadge /> : null}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatINR(p.ex_showroom)}</TableCell>
                  <TableCell className="tabular-nums">{formatINR(p.on_road_total)}</TableCell>
                  <TableCell className="max-w-56 text-xs">{p.price_kind} · {p.source}</TableCell>
                  <TableCell>{formatDate(p.verified_at)}</TableCell>
                  <TableCell>
                    {p.is_current ? (
                      <ActionButton size="sm" variant="ghost" action={retirePriceAction.bind(null, p.id, vehicle.id)} confirm={{ title: "Retire this price?", description: "It will no longer be shown publicly." }}>
                        Retire
                      </ActionButton>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {vehicle.variants.length ? (
            <details className="rounded-xl border border-dashed p-4">
              <summary className="cursor-pointer font-semibold text-primary">Record a reference price</summary>
              <div className="mt-4">
                <PriceForm vehicleId={vehicle.id} variants={vehicle.variants} cities={(cities ?? []) as City[]} defaults={{ isDemo: vehicle.is_demo }} />
              </div>
            </details>
          ) : (
            <p className="text-sm text-muted-foreground">Add a variant first.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Images</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Use only images you have rights to (e.g. manufacturer press kits) and record the source.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {vehicle.images.map((img) => (
              <div key={img.id} className="overflow-hidden rounded-xl border">
                <VehicleImage image={img} category={vehicle.category} bodyType={vehicle.body_type} alt={img.alt_text} className="aspect-[16/10]" sizes="33vw" />
                <div className="flex items-center justify-between gap-2 p-2 text-xs">
                  <span className="truncate text-muted-foreground">{img.attribution ?? img.alt_text}</span>
                  <ActionButton size="icon-sm" variant="ghost" aria-label="Delete image" action={deleteVehicleImageAction.bind(null, img.id, vehicle.id)} confirm={{ title: "Delete this image?", destructive: true, confirmLabel: "Delete" }}>
                    <Trash2 />
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
          <ImageUploadForm vehicleId={vehicle.id} />
        </CardContent>
      </Card>
    </div>
  );
}
