"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleSavedVehicleAction } from "@/lib/actions/cars";
import { cn } from "@/lib/utils";

export function SaveCarButton({
  vehicleId,
  name,
  initialSaved,
  signedIn,
  className,
}: {
  vehicleId: string;
  name: string;
  initialSaved: boolean;
  signedIn: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved cars` : `Save ${name}`}
      title={saved ? "Saved" : "Save"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) {
          toast("Sign in to save cars", { action: { label: "Sign in", onClick: () => router.push(`/login?next=${encodeURIComponent(pathname)}`) } });
          return;
        }
        setSaved((s) => !s);
        start(async () => {
          const res = await toggleSavedVehicleAction(vehicleId);
          if (!res.ok) {
            setSaved((s) => !s);
            toast.error(res.error);
          } else if (res.data) {
            setSaved(res.data.saved);
          }
        });
      }}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full border bg-white/95 text-ink shadow-sm transition-all hover:scale-110 hover:border-primary hover:text-primary disabled:opacity-70",
        saved && "border-primary text-primary",
        className,
      )}
    >
      <Heart className={cn("size-4", saved && "fill-primary")} aria-hidden="true" />
    </button>
  );
}
