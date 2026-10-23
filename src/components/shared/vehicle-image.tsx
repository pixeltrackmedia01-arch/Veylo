import Image from "next/image";
import { getPublicSupabaseEnv } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { VehicleCategory, VehicleImage as VehicleImageRow } from "@/lib/types";

export function vehicleImageUrl(image: Pick<VehicleImageRow, "storage_path" | "external_url"> | null | undefined) {
  if (!image) return null;
  if (image.storage_path) {
    const { url } = getPublicSupabaseEnv();
    return url ? `${url}/storage/v1/object/public/vehicle-images/${image.storage_path}` : null;
  }
  return image.external_url;
}

function fallbackFor(category: VehicleCategory, bodyType?: string | null) {
  if (category === "two_wheeler") return bodyType === "motorcycle" ? "/images/placeholders/motorcycle.svg" : "/images/placeholders/scooter.svg";
  return bodyType === "hatchback" ? "/images/placeholders/hatchback.svg" : "/images/placeholders/suv.svg";
}

/**
 * Vehicle photo with a clearly labelled illustrated placeholder when no
 * approved photograph has been uploaded.
 */
export function VehicleImage({
  image,
  category,
  bodyType,
  alt,
  className,
  priority,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  image: Pick<VehicleImageRow, "storage_path" | "external_url" | "is_placeholder" | "alt_text"> | null | undefined;
  category: VehicleCategory;
  bodyType?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const src = vehicleImageUrl(image) ?? fallbackFor(category, bodyType);
  const isPlaceholder = !image || image.is_placeholder || src.startsWith("/images/placeholders/");
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-rose-50/50", className)}>
      <Image
        src={src}
        alt={image?.alt_text ?? alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={src.endsWith(".svg")}
        className={cn("object-contain", isPlaceholder ? "p-6" : "object-cover")}
      />
      {isPlaceholder ? (
        <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
          Illustration · not actual vehicle
        </span>
      ) : null}
    </div>
  );
}
