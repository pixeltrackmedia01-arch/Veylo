import { Heart } from "lucide-react";
import Link from "next/link";
import { CarCard } from "@/components/cars/car-card";
import { PageHeader } from "@/components/shared/page-header";
import { requireViewer } from "@/lib/auth/session";
import { getCars, getSavedVehicleIds } from "@/lib/data/cars";

export default async function SavedCarsPage() {
  const viewer = await requireViewer("/dashboard/saved");
  const [cars, saved] = await Promise.all([getCars(), getSavedVehicleIds(viewer.id)]);
  const list = cars.filter((c) => saved.has(c.id));
  return (
    <div className="space-y-6">
      <PageHeader title="Saved cars" description="Cars you've saved with the heart icon. Prices are indicative and update as we refresh them." />
      {list.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <CarCard key={c.id} car={c} saved signedIn />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
          <Heart className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 font-semibold text-ink">No saved cars yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any car to keep it here.</p>
          <Link href="/cars" className="mt-4 inline-block font-semibold text-primary hover:underline">
            Browse new cars
          </Link>
        </div>
      )}
    </div>
  );
}
