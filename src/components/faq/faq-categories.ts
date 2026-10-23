import { BadgeIndianRupee, Car, CircleHelp, FileText, Handshake, Landmark, ShieldCheck, Store, UserRound, Users } from "lucide-react";

export const FAQ_CATEGORIES = [
  { key: "how_it_works", label: "How it works", icon: CircleHelp },
  { key: "joining", label: "Joining a group", icon: Users },
  { key: "pricing", label: "Pricing & savings", icon: BadgeIndianRupee },
  { key: "quotations", label: "Dealer quotations", icon: FileText },
  { key: "buying", label: "Buying & delivery", icon: Car },
  { key: "loans", label: "Car loans & EMI", icon: Landmark },
  { key: "insurance", label: "Insurance", icon: ShieldCheck },
  { key: "account", label: "Account & privacy", icon: UserRound },
  { key: "dealers", label: "For dealers", icon: Store },
] as const;

export const OTHER_CATEGORY = { key: "other", label: "More questions", icon: Handshake } as const;

export function categoryMeta(key: string) {
  return FAQ_CATEGORIES.find((c) => c.key === key) ?? { ...OTHER_CATEGORY, label: key.replace(/_/g, " ") };
}
