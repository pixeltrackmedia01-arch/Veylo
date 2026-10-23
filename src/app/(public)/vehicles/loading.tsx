import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-14" aria-busy="true" aria-label="Loading vehicles">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-6 h-32 w-full" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
    </div>
  );
}
