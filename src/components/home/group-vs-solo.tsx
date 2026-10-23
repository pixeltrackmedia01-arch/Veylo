import { ArrowRight, Check, CircleMinus, User, Users } from "lucide-react";
import Link from "next/link";

const ROWS: { label: string; solo: string; group: string }[] = [
  { label: "Bargaining power", solo: "Just you, one enquiry among many", group: "20 verified buyers asking for the same variant" },
  { label: "Who competes", solo: "You visit showrooms one by one", group: "Several authorised dealers quote for the whole group" },
  { label: "Price breakdown", solo: "Often a single verbal figure, extras bundled in", group: "Itemised: ex-showroom, RTO, insurance, accessories, charges" },
  { label: "Checking the quote", solo: "Up to you to spot add-ons you didn't ask for", group: "Every quotation reviewed by our team before you see it" },
  { label: "Time spent", solo: "Several showroom visits and follow-up calls", group: "Compare quotes from home, visit only the dealer you pick" },
  { label: "Likely outcome", solo: "Whatever you manage to negotiate", group: "Better offers are likely — but never guaranteed" },
  { label: "Cost & commitment", solo: "Free, no commitment", group: "Free (₹0 joining fee), leave any time, no obligation to buy" },
];

/** "Buying alone vs buying as a group" comparison. */
export function GroupVsSolo() {
  return (
    <section className="relative isolate overflow-hidden bg-ink py-20 text-white" aria-labelledby="vs-heading">
      <div className="absolute top-0 left-1/2 -z-10 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[130px]" aria-hidden="true" />
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-widest text-rose-300 uppercase">Solo vs group</p>
          <h2 id="vs-heading" className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
            Buying alone vs buying as a group
          </h2>
          <p className="mt-3 text-white/70">Same car, same dealerships. What changes is who&apos;s at the table.</p>
        </div>

        {/* Visual: one buyer vs a full group */}
        <div className="mt-12 grid items-stretch gap-5 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-white/10">
              <User className="size-8 text-white/80" aria-hidden="true" />
            </span>
            <p className="mt-4 text-lg font-bold text-white">On your own</p>
            <p className="mt-1 text-sm text-white/60">1 buyer · 1 enquiry · 1 showroom at a time</p>
          </div>
          <div className="flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full border border-white/15 bg-ink text-sm font-extrabold text-white/80 shadow-lg">
              VS
            </span>
          </div>
          <div className="relative overflow-hidden rounded-3xl border-2 border-primary/60 bg-gradient-to-br from-primary/25 to-white/5 p-8 text-center shadow-[0_0_60px_-15px] shadow-primary/60">
            <span className="absolute top-4 right-4 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase">Recommended</span>
            <div className="mx-auto grid w-fit grid-cols-10 gap-1.5" aria-hidden="true">
              {Array.from({ length: 20 }, (_, i) => (
                <span
                  key={i}
                  className="animate-pop flex size-6 items-center justify-center rounded-full bg-white/90 text-primary"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <User className="size-3.5" />
                </span>
              ))}
            </div>
            <p className="mt-5 flex items-center justify-center gap-2 text-lg font-bold text-white">
              <Users className="size-5" aria-hidden="true" /> With a group
            </p>
            <p className="mt-1 text-sm text-white/75">20 verified buyers · itemised quotes · dealers compete</p>
          </div>
        </div>

        {/* Comparison table */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="hidden grid-cols-[1fr_1.2fr_1.2fr] border-b border-white/10 text-xs font-bold tracking-wider uppercase md:grid">
            <div className="px-6 py-4 text-white/50">What matters</div>
            <div className="px-6 py-4 text-white/50">Buying alone</div>
            <div className="bg-primary/15 px-6 py-4 text-rose-200">Buying as a group</div>
          </div>
          <ul>
            {ROWS.map((r) => (
              <li key={r.label} className="group grid gap-2 border-b border-white/10 px-5 py-5 transition-colors last:border-b-0 hover:bg-white/[0.04] md:grid-cols-[1fr_1.2fr_1.2fr] md:gap-0 md:p-0">
                <p className="font-semibold text-white md:px-6 md:py-5">{r.label}</p>
                <p className="flex items-start gap-2.5 text-sm text-white/60 md:px-6 md:py-5">
                  <CircleMinus className="mt-0.5 size-4 shrink-0 text-white/35" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Alone: </span>
                    {r.solo}
                  </span>
                </p>
                <p className="flex items-start gap-2.5 text-sm font-medium text-white md:bg-primary/10 md:px-6 md:py-5 md:transition-colors md:group-hover:bg-primary/20">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-ink">
                    <Check className="size-3" aria-hidden="true" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="sr-only">Group: </span>
                    {r.group}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link
            href="/groups"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-7 font-bold text-white shadow-lg shadow-primary/40 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
          >
            Join a group for free <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <p className="text-xs text-white/50">Dealers decide their offers. A group improves your odds; it doesn&apos;t guarantee a discount.</p>
        </div>
      </div>
    </section>
  );
}
