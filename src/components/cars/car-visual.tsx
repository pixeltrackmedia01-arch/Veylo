import { CarArt } from "@/components/shared/car-art";
import { VehicleImage } from "@/components/shared/vehicle-image";
import type { Vehicle, VehicleImage as VehicleImageRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A colourful paint option for cards (a red or blue reads better than white).
 * `seed` (e.g. the model slug) spreads the choice so a grid isn't all one colour.
 */
export function featureColour(colours: { hex: string }[] | null | undefined, seed = "") {
  const scored = (colours ?? []).map((c) => {
    const n = c.hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return { hex: c.hex, score: (max === 0 ? 0 : (max - min) / max) * (max > 0.25 ? 1 : 0.3) };
  });
  const vivid = scored.filter((c) => c.score > 0.3);
  if (!vivid.length) return scored.sort((a, b) => b.score - a.score)[0]?.hex ?? null;
  const hash = [...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return vivid[hash % vivid.length].hex;
}

/**
 * A car's uploaded photo when one exists, otherwise a recoloured illustration
 * clearly labelled as such.
 */
export function CarVisual({
  car,
  colour,
  className,
  imageClassName,
  priority,
  sizes,
}: {
  car: Pick<Vehicle, "model_name" | "body_type" | "category" | "colours"> & { images?: VehicleImageRow[]; manufacturer?: { name: string } };
  colour?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const photo = car.images?.find((i) => !i.is_placeholder);
  const name = `${car.manufacturer?.name ?? ""} ${car.model_name}`.trim();
  if (photo) {
    return (
      <VehicleImage
        image={photo}
        category={car.category}
        bodyType={car.body_type}
        alt={name}
        className={cn(className, imageClassName)}
        priority={priority}
        sizes={sizes}
      />
    );
  }
  const paint = colour ?? featureColour(car.colours, car.model_name) ?? "#c8102e";
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white", className)}>
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-200/70 to-transparent" aria-hidden="true" />
      <CarArt body={car.body_type} color={paint} title={`${name} (illustration)`} className={cn("relative w-[88%]", imageClassName)} />
      <span className="absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
        Illustration
      </span>
    </div>
  );
}
