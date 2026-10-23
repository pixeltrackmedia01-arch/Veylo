"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordBookingAction, startQuotationAction, submitDealerSaleClaimAction, updateAvailabilityAction } from "@/lib/actions/dealer";
import { todayInIndia } from "@/lib/format";

export function StartQuotationButton({ requestId, label = "Prepare quotation" }: { requestId: string; label?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startQuotationAction(requestId);
          if (res.ok && res.data) router.push(`/dealer/quotations/${res.data.id}`);
          else if (!res.ok) toast.error(res.error);
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} {label}
    </Button>
  );
}

export function AvailabilityForm({ quotationId, availabilityNote, validUntil }: { quotationId: string; availabilityNote: string; validUntil: string }) {
  const [note, setNote] = useState(availabilityNote);
  const [date, setDate] = useState(validUntil);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateAvailabilityAction(quotationId, { availabilityNote: note, validUntil: date });
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="avail">Stock / availability</Label>
        <Textarea id="avail" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="valid">Valid until</Label>
        <Input id="valid" type="date" value={date} max={validUntil} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>Update</Button>
      <p className="text-xs text-muted-foreground sm:col-span-3">Validity can be shortened here. To extend it, contact the GroupDrive team so the change is reviewed.</p>
    </form>
  );
}

export function BookingForm({ enquiryId }: { enquiryId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="grid gap-2 sm:grid-cols-4 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await recordBookingAction({
            enquiryId,
            bookingDate: String(fd.get("bookingDate")),
            reference: String(fd.get("reference") ?? "") || undefined,
            expectedDelivery: String(fd.get("expectedDelivery") ?? "") || undefined,
          });
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <div className="grid gap-1"><Label htmlFor={`bd-${enquiryId}`}>Booking date</Label><Input id={`bd-${enquiryId}`} name="bookingDate" type="date" required max={todayInIndia()} /></div>
      <div className="grid gap-1"><Label htmlFor={`br-${enquiryId}`}>Booking reference</Label><Input id={`br-${enquiryId}`} name="reference" /></div>
      <div className="grid gap-1"><Label htmlFor={`ed-${enquiryId}`}>Expected delivery</Label><Input id={`ed-${enquiryId}`} name="expectedDelivery" type="date" /></div>
      <Button type="submit" size="sm" disabled={pending}>Record booking</Button>
    </form>
  );
}

export function DealerSaleClaimForm({ enquiryId }: { enquiryId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="grid gap-2 sm:grid-cols-5 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("enquiryId", enquiryId);
        start(async () => {
          const res = await submitDealerSaleClaimAction(fd);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <div className="grid gap-1"><Label htmlFor={`sd-${enquiryId}`}>Sale / delivery date</Label><Input id={`sd-${enquiryId}`} name="saleDate" type="date" required max={todayInIndia()} /></div>
      <div className="grid gap-1"><Label htmlFor={`in-${enquiryId}`}>Invoice number</Label><Input id={`in-${enquiryId}`} name="invoiceNumber" /></div>
      <div className="grid gap-1"><Label htmlFor={`sr-${enquiryId}`}>Sale reference</Label><Input id={`sr-${enquiryId}`} name="saleReference" /></div>
      <div className="grid gap-1"><Label htmlFor={`ev-${enquiryId}`}>Invoice (PDF/JPG/PNG)</Label><Input id={`ev-${enquiryId}`} name="evidence" type="file" accept="application/pdf,image/jpeg,image/png" className="pt-2" /></div>
      <Button type="submit" size="sm" disabled={pending}>Submit sale claim</Button>
    </form>
  );
}
