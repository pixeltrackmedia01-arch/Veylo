"use client";

import { FileDown, LoaderCircle, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEnquiryAction,
  quotationDocumentLinkAction,
  respondIntentAction,
  submitPurchaseClaimAction,
} from "@/lib/actions/customer";
import { todayInIndia } from "@/lib/format";

export function IntentButtons({ batchId }: { batchId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const respond = (confirm: boolean) =>
    start(async () => {
      const res = await respondIntentAction({ batchId, confirm });
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => respond(true)} disabled={pending}>
        <ThumbsUp aria-hidden="true" /> Yes, I still plan to buy
      </Button>
      <Button variant="outline" onClick={() => respond(false)} disabled={pending}>
        <ThumbsDown aria-hidden="true" /> No longer planning to buy
      </Button>
    </div>
  );
}

export function EnquiryDialog({ quotationId, dealerName }: { quotationId: string; dealerName: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sharePhone, setSharePhone] = useState(true);
  const [consent, setConsent] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send aria-hidden="true" /> Contact this dealership
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contact {dealerName}</DialogTitle>
          <DialogDescription>
            We&apos;ll share your name and email{sharePhone ? " and mobile number" : ""} with this dealership only. You&apos;re under no
            obligation to buy.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="enquiry-message">Message (optional)</Label>
          <Textarea id="enquiry-message" value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Preferred colour, best time to call" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={sharePhone} onChange={(e) => setSharePhone(e.target.checked)} /> Share my mobile number
        </label>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I agree to share these contact details with {dealerName} for this enquiry.
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!consent || pending}
            onClick={() =>
              start(async () => {
                const res = await createEnquiryAction({ quotationId, message: message || undefined, sharePhone, consent });
                if (res.ok) {
                  toast.success(res.message);
                  setOpen(false);
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} Send enquiry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuotationDocumentButton({ quotationId }: { quotationId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await quotationDocumentLinkAction(quotationId);
          if (res.ok && res.data) window.open(res.data.url, "_blank", "noopener,noreferrer");
          else if (!res.ok) toast.error(res.error);
        })
      }
    >
      <FileDown aria-hidden="true" /> Quotation document
    </Button>
  );
}

export function PurchaseClaimForm({ enquiryId }: { enquiryId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="grid gap-3 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set("enquiryId", enquiryId);
        start(async () => {
          const res = await submitPurchaseClaimAction(data);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`sale-date-${enquiryId}`}>Purchase date</Label>
        <Input id={`sale-date-${enquiryId}`} name="saleDate" type="date" required max={todayInIndia()} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`invoice-${enquiryId}`}>Invoice number (optional)</Label>
        <Input id={`invoice-${enquiryId}`} name="invoiceNumber" maxLength={80} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`evidence-${enquiryId}`}>Invoice or delivery note (optional)</Label>
        <Input id={`evidence-${enquiryId}`} name="evidence" type="file" accept="application/pdf,image/jpeg,image/png" className="pt-2" />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} I bought this vehicle
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Files are private: visible only to you, the dealership on this enquiry and GroupDrive staff verifying the sale.
        </p>
      </div>
    </form>
  );
}
