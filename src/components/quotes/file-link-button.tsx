"use client";

import { FileDown } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { privateFileLinkAction } from "@/lib/actions/quotes";

export function FileLinkButton({ bucket, path, label }: { bucket: "quotation-documents" | "sale-evidence"; path: string; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await privateFileLinkAction(bucket, path);
          if (res.ok && res.data) window.open(res.data.url, "_blank", "noopener,noreferrer");
          else if (!res.ok) toast.error(res.error);
        })
      }
    >
      <FileDown aria-hidden="true" /> {label ?? path.split("/").pop()}
    </Button>
  );
}
