import type { FaqItem } from "@/components/faq/faq-list";
import type { CarSummary } from "@/lib/data/cars";
import { fuelLabel, transmissionLabel } from "@/lib/domain/car-labels";
import { formatINR, formatPriceLakh } from "@/lib/format";
import { siteConfig } from "@/config/site";

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/** Questions answered from the car's own catalogue data. */
export function carFaqItems(car: CarSummary, openGroups: number, city: string): FaqItem[] {
  const name = `${car.manufacturer.name} ${car.model_name}`;
  const variants = car.variantsWithPrice;
  const fuels = uniq(variants.map((v) => fuelLabel(v.fuel_type)));
  const trans = uniq(variants.map((v) => transmissionLabel(v.transmission)));
  const mileages = uniq(variants.map((v) => v.specifications?.["Mileage"]).filter(Boolean).map(String));
  const ranges = uniq(variants.map((v) => v.specifications?.["Range"]).filter(Boolean).map(String));
  const seating = variants[0]?.specifications?.["Seating"];
  const items: FaqItem[] = [];

  if (car.fromPrice) {
    items.push({
      anchor: "price",
      question: `What is the price of the ${name} in ${city}?`,
      answer: `The ${name} is priced from ${formatPriceLakh(car.fromPrice)}${car.toPrice && car.toPrice !== car.fromPrice ? ` to ${formatPriceLakh(car.toPrice)}` : ""} (indicative ex-showroom, ${city}). Prices change with offers and model-year updates, so confirm with an authorised dealer.`,
    });
  }
  if (car.fromOnRoad) {
    items.push({
      anchor: "on-road-price",
      question: `What is the on-road price of the ${name} in ${city}?`,
      answer: `Our estimate for the base variant is about ${formatINR(car.fromOnRoad)} on-road, including road tax, registration, first-year insurance and other charges. Use "Get On-Road Price" for a dealer quote.`,
    });
  }
  if (mileages.length || ranges.length) {
    items.push({
      anchor: "mileage",
      question: ranges.length ? `What is the range of the ${name}?` : `What is the mileage of the ${name}?`,
      answer: ranges.length
        ? `The claimed range is ${ranges.join(" / ")} depending on the battery. Real-world range depends on driving style, temperature and load.`
        : `Claimed (ARAI) mileage is ${mileages.join(", ")} depending on the variant. Real-world mileage is usually lower.`,
    });
  }
  items.push({
    anchor: "variants",
    question: `How many variants of the ${name} are there?`,
    answer: `We list ${variants.length} variants: ${variants.map((v) => v.name).join(", ")}. It is offered with ${fuels.join(" and ")} power and ${trans.join(" / ")} gearboxes.`,
  });
  if (seating) {
    items.push({ anchor: "seating", question: `How many people can sit in the ${name}?`, answer: `The ${name} is a ${String(seating).replace(" seats", "")}-seater.` });
  }
  if (car.warranty) {
    items.push({ anchor: "warranty", question: `What warranty does the ${name} come with?`, answer: `${car.warranty}. Extended warranty packages are usually available from the dealer.` });
  }
  if (car.emiFrom) {
    items.push({
      anchor: "emi",
      question: `What will the EMI be for the ${name}?`,
      answer: `Around ${formatINR(car.emiFrom)} a month for the base variant, assuming ${siteConfig.emi.downPaymentPct}% down payment, ${siteConfig.emi.annualRatePct}% interest and ${siteConfig.emi.tenureMonths / 12} years. Use the EMI calculator on this page to change these.`,
    });
  }
  items.push({
    anchor: "group-deal",
    question: `Is there a group deal for the ${name}?`,
    answer: openGroups
      ? `Yes — ${openGroups} group${openGroups > 1 ? "s are" : " is"} open in ${city}. Joining is free and you decide whether to buy once reviewed dealer quotations are published.`
      : `Not right now. Tap "Check my price" and we'll let you know when a group opens for this car in ${city}. Joining a group is always free.`,
  });
  return items;
}
