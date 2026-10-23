import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { CarVisual } from "@/components/cars/car-visual";
import { CompareToggle } from "@/components/cars/compare-toggle";
import { SaveCarButton } from "@/components/cars/save-car-button";
import type { CarSummary } from "@/lib/data/cars";
import { fuelLabel, transmissionLabel } from "@/lib/domain/car-labels";
import { formatINR, formatPriceLakh } from "@/lib/format";

export function carSpecTiles(car: CarSummary) {
  const v = car.baseVariant;
  if (!v) return [];
  const specs = v.specifications ?? {};
  const ev = v.fuel_type === "electric";
  return [
    fuelLabel(v.fuel_type),
    transmissionLabel(v.transmission),
    ev ? String(specs["Battery"] ?? "—") : v.engine_cc ? `${v.engine_cc} cc` : "—",
    ev ? String(specs["Range"] ?? "—").replace(/\s*\(.*\)/, "") : String(specs["Mileage"] ?? "—"),
  ];
}

export function CarCard({ car, saved, signedIn }: { car: CarSummary; saved: boolean; signedIn: boolean }) {
  const name = `${car.manufacturer.name} ${car.model_name}`;
  const openGroup = car.openBatchCount > 0;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]">
      <Link href={`/cars/${car.slug}`} className="absolute inset-0 z-0" aria-label={`View ${name}`} />
      <div className="relative">
        <CarVisual car={car} className="aspect-[16/10]" imageClassName="transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <SaveCarButton vehicleId={car.id} name={name} initialSaved={saved} signedIn={signedIn} />
          <CompareToggle slug={car.slug} name={name} />
        </div>
        {openGroup ? (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow">
            <Users className="size-3.5" aria-hidden="true" /> Group deal open
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{car.manufacturer.name}</p>
        <h3 className="mt-0.5 text-lg font-bold text-ink transition-colors group-hover:text-primary">{car.model_name}</h3>
        <p className="mt-1">
          <span className="text-xl font-extrabold text-primary">{formatPriceLakh(car.fromPrice)}</span>
          {car.fromPrice ? <span className="ml-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">onwards</span> : null}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
          {carSpecTiles(car).map((tile, i) => (
            <div key={i} className="truncate rounded-md bg-secondary px-2.5 py-1.5 font-medium text-ink/80">
              <dt className="sr-only">{["Fuel", "Transmission", "Engine", "Mileage"][i]}</dt>
              <dd>{tile}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs">
          <span className="text-muted-foreground">
            {car.emiFrom ? (
              <>
                EMI from <strong className="text-ink">{formatINR(car.emiFrom)}</strong>/mo
              </>
            ) : (
              "Price on request"
            )}
          </span>
          <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
            View Details <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}
