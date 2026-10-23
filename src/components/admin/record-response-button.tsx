"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startQuotationForDealerAction } from "@/lib/actions/admin-ops";

/** Creates (or opens) the quotation draft for a request so an admin can record a dealer's emailed response. */
export function RecordResponseButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="link"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startQuotationForDealerAction(requestId);
          if (res.ok && res.data) router.push(`/admin/quotations/${res.data.id}`);
          else if (!res.ok) toast.error(res.error);
        })
      }
    >
      Record response
    </Button>
  );
}
