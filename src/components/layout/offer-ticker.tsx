import { BadgeIndianRupee, Calculator, Car, Flame, Gift, type LucideIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { getPublicSetting, listPublicBatches } from "@/lib/data/catalogue";
import { spotsLeft } from "@/lib/domain/batch-lifecycle";
import { isSupabaseConfigured } from "@/lib/env";

type TickerItem = { text: string; href?: string; icon?: string };

const ICONS: Record<string, LucideIcon> = { gift: Gift, rupee: BadgeIndianRupee, car: Car, calc: Calculator, fire: Flame, spark: Sparkles };

/** Default offer lines; admins can override them with the `home.ticker` setting. */
export const DEFAULT_TICKER: TickerItem[] = [
  { icon: "gift", text: "Joining any group is free — ₹0 registration or joining fee", href: "/groups" },
  {
    icon: "rupee",
    text: "Group buyers save an estimated ₹20,000 – ₹60,000 per car (estimate, not guaranteed)",
    href: "/faq#how-much-can-i-save",
  },
  { icon: "car", text: "Book a free test drive on any new car", href: "/cars" },
  { icon: "calc", text: "New: EMI calculator and side-by-side car comparison", href: "/emi-calculator" },
];

/** Thin announcement bar with offers and live group progress, scrolling right to left. */
export async function OfferTicker() {
  let items = DEFAULT_TICKER;
  if (isSupabaseConfigured()) {
    const [custom, groups] = await Promise.all([
      getPublicSetting<TickerItem[] | null>("home.ticker", null),
      listPublicBatches({ status: "open", limit: 4 }).catch(() => []),
    ]);
    if (Array.isArray(custom) && custom.length) items = custom.filter((i) => i && typeof i.text === "string");
    const live = groups
      .filter((g) => g.verified_participant_count > 0)
      .map((g) => ({
        icon: "fire",
        text: `${g.variant.vehicle.model_name} ${g.variant.name}: ${g.verified_participant_count} of ${g.target_participants} buyers joined — ${spotsLeft(g)} ${spotsLeft(g) === 1 ? "spot" : "spots"} left${g.is_demo ? " (demo)" : ""}`,
        href: `/groups/${g.slug}`,
      }));
    items = [...items.slice(0, 2), ...live, ...items.slice(2)];
  }
  if (!items.length) return null;

  const row = (hidden: boolean) =>
    items.map((item, i) => {
      const Icon = ICONS[item.icon ?? "spark"] ?? Sparkles;
      const content = (
        <>
          <Icon className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
          <span>{item.text}</span>
        </>
      );
      return (
        <li key={`${hidden ? "b" : "a"}-${i}`} className="flex shrink-0 items-center gap-2 pr-10" aria-hidden={hidden || undefined}>
          {item.href ? (
            <Link href={item.href} tabIndex={hidden ? -1 : undefined} className="flex items-center gap-2 hover:underline">
              {content}
            </Link>
          ) : (
            content
          )}
          <span className="ml-8 size-1 rounded-full bg-white/40" aria-hidden="true" />
        </li>
      );
    });

  return (
    <div className="group relative z-50 overflow-hidden bg-gradient-to-r from-primary via-[#c41626] to-primary text-white" role="region" aria-label="Offers and updates">
      <ul className="animate-ticker flex w-max items-center py-2 text-[13px] font-medium group-hover:[animation-play-state:paused] sm:text-sm">
        {row(false)}
        {row(true)}
      </ul>
    </div>
  );
}
