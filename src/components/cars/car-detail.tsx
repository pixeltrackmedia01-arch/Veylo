"use client";

import {
  BadgeIndianRupee,
  Car,
  Check,
  ChevronDown,
  Fuel,
  Gauge,
  Phone,
  Settings2,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmiCalculator } from "@/components/cars/emi-calculator";
import { LeadDialog, type LeadTarget } from "@/components/cars/lead-dialog";
import { bodyLabel, fuelLabel, transmissionLabel } from "@/lib/domain/car-labels";
import { formatDate, formatINR, formatPriceLakh } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DetailVariant {
  id: string;
  name: string;
  fuel: string | null;
  transmission: string | null;
  engineCc: number | null;
  specs: Record<string, string | number>;
  features: Record<string, string[]>;
  exShowroom: number | null;
  roadTax: number | null;
  insurance: number | null;
  otherCharges: number | null;
  onRoad: number | null;
  priceKind: string | null;
  priceSource: string | null;
  priceVerifiedAt: string | null;
}

export interface DetailCar {
  id: string;
  name: string;
  model: string;
  body: string | null;
  summary: string | null;
}

/** Sticky tab bar that scrolls to sections and tracks the one in view. */
export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);
  return (
    <nav aria-label="On this page" className="sticky top-16 z-30 -mx-4 border-b bg-white/95 px-4 backdrop-blur sm:mx-0 sm:rounded-b-xl sm:border-x">
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                "relative block px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-transform",
                active === s.id ? "text-primary after:scale-x-100 after:bg-primary" : "text-ink/70 after:scale-x-0 after:bg-primary hover:text-primary",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SectionCard({ id, title, children, action }: { id: string; title: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function FeatureGroup({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-bold tracking-wide text-ink uppercase">{title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {items.length}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {open ? (
        <ul className="grid gap-x-4 gap-y-2 border-t px-4 py-3 text-sm sm:grid-cols-2">
          {items.map((f) => (
            <li key={f} className="flex items-start gap-2 text-foreground/85">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" /> {f}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Everything that follows the selected variant: highlights, prices, specs, features, on-road and EMI. */
export function CarDetailBody({ car, variants, city }: { car: DetailCar; variants: DetailVariant[]; city: string }) {
  const cheapest = useMemo(
    () => [...variants].filter((v) => v.exShowroom).sort((a, b) => a.exShowroom! - b.exShowroom!)[0] ?? variants[0],
    [variants],
  );
  const [selectedId, setSelectedId] = useState(cheapest?.id);
  const [lead, setLead] = useState<LeadTarget | null>(null);
  const v = variants.find((x) => x.id === selectedId) ?? cheapest;
  if (!v) return null;
  const ev = v.fuel === "electric";
  const label = `${car.name} ${v.name}`;

  const highlights = [
    { icon: ev ? Zap : Gauge, label: ev ? "Battery" : "Engine", value: ev ? String(v.specs["Battery"] ?? "—") : v.engineCc ? `${v.engineCc} cc` : "—" },
    { icon: Zap, label: "Power", value: String(v.specs["Max power"] ?? "—") },
    { icon: Fuel, label: "Fuel", value: fuelLabel(v.fuel) },
    { icon: Settings2, label: "Transmission", value: transmissionLabel(v.transmission) },
    { icon: Car, label: "Body type", value: bodyLabel(car.body) },
    { icon: Users, label: "Seating", value: String(v.specs["Seating"] ?? "—") },
  ];

  const specRows: [string, string][] = [
    ["Ex-showroom price", v.exShowroom ? formatINR(v.exShowroom) : "—"],
    ["Fuel", fuelLabel(v.fuel)],
    ["Transmission", transmissionLabel(v.transmission)],
    ["Body type", bodyLabel(car.body)],
    ...(v.engineCc ? ([["Engine", `${v.engineCc} cc`]] as [string, string][]) : []),
    ...Object.entries(v.specs).map(([k, val]) => [k, String(val)] as [string, string]),
  ];

  return (
    <>
      {car.summary ? (
        <p className="rounded-2xl border-l-4 border-primary bg-white px-5 py-4 text-[15px] leading-7 text-foreground/85 shadow-[var(--shadow-card)]">{car.summary}</p>
      ) : null}

      <SectionCard id="highlights" title={`${car.model} Key Highlights`}>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {highlights.map((h) => (
            <div key={h.label} className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary transition-transform group-hover:scale-110">
                <h.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{h.label}</dt>
                <dd className="truncate text-sm font-semibold text-ink">{h.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </SectionCard>

      <SectionCard id="price" title={`${car.model} Price List`}>
        <p className="-mt-2 mb-3 text-sm text-muted-foreground">
          {variants.length} variants · indicative ex-showroom prices in {city}. Select a variant to see its specifications, features, on-road
          price and EMI.
        </p>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-surface text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Variant</th>
                <th className="px-4 py-2.5 font-semibold">Fuel</th>
                <th className="px-4 py-2.5 font-semibold">Transmission</th>
                <th className="px-4 py-2.5 font-semibold">{ev ? "Range" : "Mileage"}</th>
                <th className="px-4 py-2.5 font-semibold">Power</th>
                <th className="px-4 py-2.5 text-right font-semibold">Ex-showroom</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((x) => {
                const selected = x.id === v.id;
                return (
                  <tr
                    key={x.id}
                    onClick={() => setSelectedId(x.id)}
                    className={cn("cursor-pointer border-t transition-colors", selected ? "bg-accent/70" : "hover:bg-surface")}
                  >
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setSelectedId(x.id)} aria-pressed={selected} className="text-left font-semibold text-ink">
                        <span className={cn(selected && "text-primary")}>{x.name}</span>
                        {x.id === cheapest?.id ? (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Base</span>
                        ) : null}
                      </button>
                    </td>
                    <td className="px-4 py-3">{fuelLabel(x.fuel)}</td>
                    <td className="px-4 py-3">{transmissionLabel(x.transmission)}</td>
                    <td className="px-4 py-3">{String(x.fuel === "electric" ? (x.specs["Range"] ?? "—") : (x.specs["Mileage"] ?? "—"))}</td>
                    <td className="px-4 py-3">{String(x.specs["Max power"] ?? "—")}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-ink">{formatPriceLakh(x.exShowroom)}</span>
                      {x.onRoad ? <span className="block text-[11px] text-muted-foreground">On-road ≈ {formatPriceLakh(x.onRoad)}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {v.priceSource ?? "Indicative prices"}
          {v.priceVerifiedAt ? ` · last checked ${formatDate(v.priceVerifiedAt)}` : ""}. Prices, offers and availability are confirmed by the dealership.
        </p>
      </SectionCard>

      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-accent to-white p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-white">
            <BadgeIndianRupee className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold text-ink">
              Best price for {car.model} {v.name} in {city} this month
            </p>
            <p className="text-sm text-muted-foreground">Join a group or ask us to get dealer quotes for this variant.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLead({ kind: "best_price", vehicleId: car.id, variantId: v.id, label })}
          className="h-11 shrink-0 rounded-xl bg-primary px-5 font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
        >
          Check my price
        </button>
      </section>

      <SectionCard id="specs" title={`${car.model} ${v.name} Specifications`}>
        <dl className="grid overflow-hidden rounded-xl border sm:grid-cols-2">
          {specRows.map(([k, val], i) => (
            <div key={k} className={cn("flex justify-between gap-4 border-b px-4 py-2.5 text-sm", i % 4 < 2 ? "bg-white" : "bg-surface/70")}>
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-semibold text-ink">{val}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Manufacturer-claimed figures. Mileage is ARAI-certified and real-world figures vary.</p>
      </SectionCard>

      {Object.keys(v.features).length ? (
        <SectionCard id="features" title={`Features of the ${v.name}`}>
          <div className="space-y-3">
            {Object.entries(v.features).map(([group, items]) => (
              <FeatureGroup key={group} title={group} items={items} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Indicative equipment for this trim level. Confirm the exact feature list with the dealership.</p>
        </SectionCard>
      ) : null}

      <SectionCard id="on-road" title={`On-road price in ${city}`}>
        {v.exShowroom ? (
          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
            <dl className="divide-y rounded-xl border text-sm">
              {[
                ["Ex-showroom price", v.exShowroom],
                ["RTO / road tax & registration", v.roadTax],
                ["Insurance (first year, estimate)", v.insurance],
                ["Other charges (plates, FASTag etc.)", v.otherCharges],
              ].map(([k, val]) => (
                <div key={String(k)} className="flex justify-between px-4 py-2.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-ink">{formatINR(val as number | null)}</dd>
                </div>
              ))}
              <div className="flex justify-between bg-accent/60 px-4 py-3">
                <dt className="font-bold text-ink">On-road price (estimate)</dt>
                <dd className="text-lg font-extrabold text-primary">{formatINR(v.onRoad)}</dd>
              </div>
            </dl>
            <div className="flex flex-col justify-center rounded-xl bg-surface p-5">
              <p className="text-sm text-muted-foreground">Want the exact on-road price?</p>
              <p className="mt-1 font-semibold text-ink">Dealers&apos; on-road prices vary with insurance, accessories and offers.</p>
              <button
                type="button"
                onClick={() => setLead({ kind: "on_road_price", vehicleId: car.id, variantId: v.id, label })}
                className="mt-4 h-11 rounded-xl bg-primary font-bold text-white transition-colors hover:bg-primary-hover"
              >
                Get On-Road Price
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Price not available for this variant yet.</p>
        )}
      </SectionCard>

      <SectionCard id="emi" title={`${car.model} EMI Calculator`}>
        <EmiCalculator
          key={v.id}
          price={v.onRoad ?? v.exShowroom ?? 1000000}
          priceLabel={`On-road price · ${v.name}`}
          minPrice={Math.max(100000, Math.round(((v.onRoad ?? 1000000) * 0.5) / 10000) * 10000)}
          maxPrice={Math.round(((v.onRoad ?? 1000000) * 1.5) / 10000) * 10000}
          onLoanEnquiry={() => setLead({ kind: "car_loan", vehicleId: car.id, variantId: v.id, label })}
          className="border-none p-0 shadow-none sm:p-0"
        />
      </SectionCard>

      <LeadDialog target={lead} onOpenChange={(o) => !o && setLead(null)} />
    </>
  );
}

/** Sidebar "Interested in…?" card with the lead actions. */
export function LeadCard({ carId, model }: { carId: string; model: string }) {
  const [lead, setLead] = useState<LeadTarget | null>(null);
  const open = (kind: LeadTarget["kind"]) => setLead({ kind, vehicleId: carId, label: model });
  return (
    <div className="rounded-2xl border-2 border-primary/25 bg-white p-5 shadow-[var(--shadow-card)]">
      <p className="text-lg font-bold text-ink">Interested in {model}?</p>
      <p className="mt-1 text-sm text-muted-foreground">Tell us your details to get the best price in your city.</p>
      <div className="mt-4 space-y-2.5">
        <button type="button" onClick={() => open("on_road_price")} className="h-11 w-full rounded-xl bg-primary font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-hover">
          Get On-Road Price
        </button>
        <button type="button" onClick={() => open("test_drive")} className="h-11 w-full rounded-xl border font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
          Book Test Drive
        </button>
        <button type="button" onClick={() => open("callback")} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
          <Phone className="size-4" aria-hidden="true" /> Call Me Back
        </button>
      </div>
      <div className="mt-4 flex justify-around border-t pt-3 text-sm">
        <button type="button" onClick={() => open("car_loan")} className="font-medium text-ink/80 hover:text-primary">
          Car Loan
        </button>
        <span className="text-border">|</span>
        <button type="button" onClick={() => open("insurance")} className="inline-flex items-center gap-1 font-medium text-ink/80 hover:text-primary">
          <ShieldCheck className="size-4" aria-hidden="true" /> Insurance
        </button>
      </div>
      <LeadDialog target={lead} onOpenChange={(o) => !o && setLead(null)} />
    </div>
  );
}

/** Mobile sticky bottom bar. */
export function MobileActionBar({ carId, model, groupHref, fromPrice }: { carId: string; model: string; groupHref: string | null; fromPrice: number | null }) {
  const [lead, setLead] = useState<LeadTarget | null>(null);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.2)] backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{model}</p>
          <p className="font-extrabold text-primary">{formatPriceLakh(fromPrice)}*</p>
        </div>
        {groupHref ? (
          <Link href={groupHref} className="inline-flex h-11 items-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white">
            Join Group
          </Link>
        ) : null}
        <button type="button" onClick={() => setLead({ kind: "on_road_price", vehicleId: carId, label: model })} className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white">
          Get Price
        </button>
      </div>
      <LeadDialog target={lead} onOpenChange={(o) => !o && setLead(null)} />
    </div>
  );
}

