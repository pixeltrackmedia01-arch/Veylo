"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        Please try again. If the problem continues, contact us{error.digest ? ` and quote reference ${error.digest}` : ""}.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
