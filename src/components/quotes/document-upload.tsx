"use client";

import { LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadQuotationDocumentAction } from "@/lib/actions/quotes";

export function QuotationDocumentUpload({ quotationId }: { quotationId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set("quotationId", quotationId);
        start(async () => {
          const res = await uploadQuotationDocumentAction(data);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <Input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required className="max-w-xs pt-2" aria-label="Quotation document (PDF, JPG or PNG, max 10 MB)" />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />} Upload document
      </Button>
    </form>
  );
}
