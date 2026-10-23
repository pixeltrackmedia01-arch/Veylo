import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { DemoBadge } from "@/components/shared/status-badge";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { CatalogueVehicle } from "@/lib/data/catalogue";
import { formatINR } from "@/lib/format";
import { titleCase } from "@/lib/utils";

export function VehicleCard({ vehicle }: { vehicle: CatalogueVehicle }) {
  const bestOpen = vehicle.batches
    .filter((b) => b.status === "open")
    .sort((a, b) => b.verified_participant_count / b.target_participants - a.verified_participant_count / a.target_participants)[0];
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <VehicleImage
        image={vehicle.images[0]}
        category={vehicle.category}
        bodyType={vehicle.body_type}
        alt={`${vehicle.manufacturer.name} ${vehicle.model_name}`}
        className="aspect-[16/10]"
      />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{vehicle.category === "car" ? "Car" : "Two-wheeler"}</Badge>
          {vehicle.body_type ? <Badge variant="neutral">{titleCase(vehicle.body_type)}</Badge> : null}
          {vehicle.is_demo ? <DemoBadge /> : null}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{vehicle.manufacturer.name}</p>
          <h3 className="text-xl font-bold">
            <Link href={`/vehicles/${vehicle.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {vehicle.model_name}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {vehicle.variants.length} variant{vehicle.variants.length === 1 ? "" : "s"}
            {vehicle.variants.length ? `: ${vehicle.variants.map((v) => v.name).join(", ")}` : ""}
          </p>
        </div>
        {vehicle.lowestExShowroom !== null ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Indicative ex-showroom from </span>
            <span className="font-semibold text-ink">{formatINR(vehicle.lowestExShowroom)}</span>
            {vehicle.isDemoPricing ? <span className="text-xs text-amber-700"> (demo figure)</span> : null}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Price reference not yet verified</p>
        )}
        <div className="mt-auto space-y-2 border-t pt-3">
          {bestOpen ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <Users className="size-4 text-primary" aria-hidden="true" />
                  {bestOpen.verified_participant_count}/{bestOpen.target_participants} in leading group
                </span>
                <span className="text-xs text-muted-foreground">{vehicle.openBatchCount} open</span>
              </div>
              <Progress size="sm" value={bestOpen.verified_participant_count} max={bestOpen.target_participants} label={`${vehicle.model_name} group progress`} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {vehicle.activeBatchCount > 0 ? `${vehicle.activeBatchCount} group(s) in quotation stage` : "No open group yet"}
            </p>
          )}
          <span className="flex items-center gap-1 text-sm font-semibold text-primary">
            View groups <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}
