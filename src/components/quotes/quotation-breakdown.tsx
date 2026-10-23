import { DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { computeQuoteTotals, LINE_ITEM_LABELS, LINE_ITEM_ORDER } from "@/lib/domain/pricing";
import { formatDate, formatINR } from "@/lib/format";
import type { DealerQuotation, QuotationLineItem } from "@/lib/types";

/** Itemised quotation table: included charges, discounts, excluded items and totals. */
export function QuotationBreakdown({
  quote,
  items,
  showStatus = false,
}: {
  quote: Pick<DealerQuotation, "status" | "valid_until" | "conditions" | "availability_note" | "delivery_timeline" | "quote_reference" | "is_demo" | "total_payable">;
  items: QuotationLineItem[];
  showStatus?: boolean;
}) {
  const sorted = [...items].sort(
    (a, b) => LINE_ITEM_ORDER.indexOf(a.category) - LINE_ITEM_ORDER.indexOf(b.category) || a.sort_order - b.sort_order,
  );
  const included = sorted.filter((i) => i.is_included);
  const excluded = sorted.filter((i) => !i.is_included);
  const totals = computeQuoteTotals(items);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {showStatus ? <StatusBadge status={quote.status} /> : null}
        {quote.is_demo ? <DemoBadge /> : null}
        {quote.quote_reference ? <span>Ref. {quote.quote_reference}</span> : null}
        <span>Valid until {formatDate(quote.valid_until)}</span>
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">Itemised quotation</caption>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground uppercase">
            <th scope="col" className="py-2 font-semibold">Item</th>
            <th scope="col" className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {included.map((i) => (
            <tr key={i.id} className="border-b border-dashed">
              <td className="py-2.5">
                <span className="font-medium text-ink">{i.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {LINE_ITEM_LABELS[i.category]}
                  {i.notes ? ` · ${i.notes}` : ""}
                </span>
              </td>
              <td className={`py-2.5 text-right tabular-nums ${i.category === "discount" ? "text-success" : ""}`}>
                {i.category === "discount" ? "− " : ""}
                {formatINR(i.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="pt-3 text-left font-semibold text-ink">Total payable (included items)</th>
            <td className="pt-3 text-right font-display text-lg font-bold tabular-nums text-ink">{formatINR(totals.payable)}</td>
          </tr>
          {totals.discounts > 0 ? (
            <tr>
              <td className="text-xs text-muted-foreground">Includes discounts of</td>
              <td className="text-right text-xs text-success tabular-nums">{formatINR(totals.discounts)}</td>
            </tr>
          ) : null}
        </tfoot>
      </table>
      {excluded.length ? (
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Listed but not included in the total</p>
          <ul className="mt-2 space-y-1 text-sm">
            {excluded.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>{i.label}</span>
                <span className="tabular-nums">{formatINR(i.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {quote.availability_note ? (
          <div>
            <dt className="text-xs text-muted-foreground">Availability</dt>
            <dd>{quote.availability_note}</dd>
          </div>
        ) : null}
        {quote.delivery_timeline ? (
          <div>
            <dt className="text-xs text-muted-foreground">Delivery timeline</dt>
            <dd>{quote.delivery_timeline}</dd>
          </div>
        ) : null}
        {quote.conditions ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Conditions</dt>
            <dd className="whitespace-pre-line">{quote.conditions}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
