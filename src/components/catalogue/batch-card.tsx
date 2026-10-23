import { CalendarClock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { BatchStatusBadge, DemoBadge } from "@/components/shared/status-badge";
import { VehicleImage } from "@/components/shared/vehicle-image";
import { Progress } from "@/components/ui/progress";
import type { BatchWithVehicle } from "@/lib/data/catalogue";
import { spotsLeft } from "@/lib/domain/batch-lifecycle";
import { formatDate, timeRemaining } from "@/lib/format";

export function BatchCard({ batch }: { batch: BatchWithVehicle }) {
  const vehicle = batch.variant.vehicle;
  const open = batch.status === "open";
  return (
    <Link
      href={`/groups/${batch.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
    >
      <VehicleImage
        image={vehicle.images?.[0]}
        category={vehicle.category}
        bodyType={vehicle.body_type}
        alt={`${vehicle.manufacturer.name} ${vehicle.model_name}`}
        className="aspect-[16/9]"
      />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <BatchStatusBadge status={batch.status} />
          {batch.is_demo ? <DemoBadge /> : null}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{vehicle.manufacturer.name}</p>
          <h3 className="text-lg font-semibold group-hover:text-primary">
            {vehicle.model_name} <span className="font-medium text-foreground/70">· {batch.variant.name}</span>
          </h3>
        </div>
        <div className="mt-auto space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <Users className="size-4 text-primary" aria-hidden="true" />
              {batch.verified_participant_count} of {batch.target_participants} verified
            </span>
            {open ? <span className="text-muted-foreground">{spotsLeft(batch)} {spotsLeft(batch) === 1 ? "spot" : "spots"} left</span> : null}
          </div>
          <Progress
            value={batch.verified_participant_count}
            max={batch.target_participants}
            label={`${batch.title} progress`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" /> {batch.city.name}
          </span>
          <span className="flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {open ? `Closes ${formatDate(batch.deadline)} · ${timeRemaining(batch.deadline)}` : `Closed ${formatDate(batch.closed_at)}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
