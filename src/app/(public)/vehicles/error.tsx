"use client";

import { Button } from "@/components/ui/button";

export default function VehiclesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-bold">We couldn&apos;t load vehicles</h1>
      <p className="mt-2 text-muted-foreground">Please try again in a moment.</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
