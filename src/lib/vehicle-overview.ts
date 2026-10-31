/**
 * Long-form "About the <model>" copy for car, bike and scooter pages, written
 * from the catalogue data (prices, variants, specifications, colours) so every
 * model gets a detailed, accurate description with contextual internal links.
 * Sections without data are left out rather than padded.
 */
import { BUDGETS } from "@/lib/domain/car-filters";
import { bodyLabel, fuelLabel, transmissionLabel } from "@/lib/domain/car-labels";
import { formatPriceLakh } from "@/lib/format";

export type OverviewSegment = string | { text: string; href: string };
export type OverviewSection = { heading: string; paragraphs: OverviewSegment[][] };

export interface OverviewVariant {
  name: string;
  fuel: string | null;
  transmission: string | null;
  engineCc: number | null;
  price: number | null;
  specs: Record<string, unknown>;
  features?: Record<string, string[]> | null;
}

export interface OverviewInput {
  brand: string;
  brandHref: string;
  model: string;
  slug: string;
  category: "car" | "two_wheeler" | string;
  body: string | null;
  bodyHref?: string | null;
  variants: OverviewVariant[];
  colours: string[];
  warranty?: string | null;
  rivals: { name: string; slug: string; href: string }[];
  compareHref?: (rivalSlug: string) => string;
}

const uniq = <T,>(xs: T[]) => [...new Set(xs.filter((x) => x !== null && x !== undefined && x !== ""))];

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Joins link/text segments into a sentence list, e.g. "A, B and C". */
function linkList(items: OverviewSegment[]): OverviewSegment[] {
  const out: OverviewSegment[] = [];
  items.forEach((item, i) => {
    if (i > 0) out.push(i === items.length - 1 ? " and " : ", ");
    out.push(item);
  });
  return out;
}

const spec = (v: OverviewVariant, key: string) => {
  const raw = v.specs?.[key];
  return raw === null || raw === undefined || raw === "" ? null : String(raw).trim();
};

/**
 * Distinct values of a spec, smallest first. Multi-mode values such as
 * "CNG Mode: 64 kW; Gasoline Mode: 75 kW" read badly in a sentence and are
 * left to the specification table.
 */
function specRange(variants: OverviewVariant[], key: string) {
  const values = (uniq(variants.map((v) => spec(v, key))) as string[])
    .map((v) => v.replace(/\(([^)]*\/[^)]*)\)/g, "$1").replace(/\s+/g, " ").trim())
    .filter((v) => !/[;:]/.test(v) && v.length <= 40);
  return uniq(values).sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0)) as string[];
}

/** "19.96 km/l to 26.90 km/kg" mixes units; group by unit instead. */
function unitRanges(values: string[]) {
  const byUnit = new Map<string, string[]>();
  for (const v of values) {
    const unit = v.replace(/^[\d.\s,-]+/, "").trim();
    byUnit.set(unit, [...(byUnit.get(unit) ?? []), v]);
  }
  return [...byUnit.values()].map((vs) => rangeText(vs)).join(" and ");
}

function rangeText(values: string[]) {
  return values.length > 1 ? `${values[0]} to ${values[values.length - 1]}` : (values[0] ?? "");
}

const article = (word: string) => (/^([aeiou]|SUV|MUV)/i.test(word) ? "an" : "a");
// "SUV" stays upper case; "Hatchback" becomes "hatchback" mid-sentence.
const lowerWord = (word: string) => (word === word.toUpperCase() ? word : word.toLowerCase());

export function buildVehicleOverview(input: OverviewInput): OverviewSection[] {
  const { brand, model, variants } = input;
  const full = `${brand} ${model}`;
  const isCar = input.category === "car";
  const kind = isCar ? "car" : input.body === "scooter" ? "scooter" : input.body === "moped" ? "moped" : "motorcycle";
  const priced = variants.filter((v) => v.price && v.price > 0).sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  const from = priced[0];
  const to = priced[priced.length - 1];
  const fuels = uniq(variants.map((v) => v.fuel)) as string[];
  const transmissions = uniq(variants.map((v) => v.transmission).filter((t) => t !== "not_applicable")) as string[];
  const ev = fuels.length === 1 && fuels[0] === "electric";
  const sections: OverviewSection[] = [];
  const bodyText = input.body ? bodyLabel(input.body) : kind;

  // Overview
  const intro: OverviewSegment[] = [
    `The ${full} is ${article(bodyText)} ${lowerWord(bodyText)} from `,
    { text: `${brand}${isCar ? " cars" : ""}`, href: input.brandHref },
    ` sold in India in ${variants.length} ${variants.length === 1 ? "variant" : "variants"}`,
  ];
  if (from && to) {
    intro.push(
      from === to
        ? `, with an ex-showroom price of ${formatPriceLakh(from.price)}.`
        : `, with ex-showroom prices from ${formatPriceLakh(from.price)} for the ${from.name} to ${formatPriceLakh(to.price)} for the ${to.name}.`,
    );
  } else intro.push(".");
  const powertrain: OverviewSegment[] = [];
  if (fuels.length) {
    powertrain.push(
      ev
        ? `It is a fully electric ${kind}`
        : `It is offered with ${list(uniq(fuels.map((f) => lowerWord(fuelLabel(f)))))} power`,
    );
    if (transmissions.length) powertrain.push(` and ${list(transmissions.map((t) => lowerWord(transmissionLabel(t))))} transmission${transmissions.length > 1 ? " options" : ""}`);
    powertrain.push(".");
  }
  if (input.bodyHref && isCar) {
    powertrain.push(" Browse other ", { text: `${lowerWord(bodyText)}s`, href: input.bodyHref }, " if you are still comparing body styles.");
  }
  sections.push({ heading: `${model} overview`, paragraphs: [intro, ...(powertrain.length ? [powertrain] : [])] });

  // Price & variants
  if (from && to) {
    const paras: OverviewSegment[][] = [];
    const names = priced.map((v) => v.name);
    paras.push([
      `The ${model} range starts with the ${from.name}${from !== to ? ` and tops out with the ${to.name}` : ""}. `,
      names.length > 2 ? `In between sit the ${list(names.slice(1, Math.min(names.length - 1, 6)))}${names.length > 7 ? ", among others" : ""}. ` : "",
      "Prices shown are the manufacturer's ex-showroom figures; the on-road price adds road tax, registration and insurance, which differ from state to state.",
    ]);
    const budget = BUDGETS.find((b) => (from.price ?? 0) >= b.min && (from.price ?? 0) < b.max);
    const tail: OverviewSegment[] = [];
    if (isCar && budget) tail.push("It competes with other ", { text: `cars ${budget.label.toLowerCase().startsWith("under") || budget.label.toLowerCase().startsWith("above") ? budget.label.toLowerCase() : `in the ${budget.label} range`}`, href: `/cars?budget=${budget.key}` }, ". ");
    tail.push("Work out a monthly instalment with the ", { text: "EMI calculator", href: "/emi-calculator" }, ".");
    paras.push(tail);
    sections.push({ heading: `${model} price and variants`, paragraphs: paras });
  }

  // Engine / motor & performance
  const cc = uniq(variants.map((v) => v.engineCc)).sort((a, b) => (a ?? 0) - (b ?? 0)) as number[];
  const power = specRange(variants, "Max power");
  const torque = specRange(variants, "Max torque");
  const battery = specRange(variants, "Battery");
  const perf: OverviewSegment[] = [];
  if (ev && battery.length) perf.push(`Battery options: ${list(battery)}. `);
  if (!ev && cc.length) perf.push(`The ${model} uses ${cc.length > 1 ? `${list(cc.map((c) => `${c} cc`))} engines` : `a ${cc[0]} cc engine`}. `);
  if (power.length) perf.push(`Maximum power is ${rangeText(power)}`, torque.length ? ` and peak torque ${rangeText(torque)}. ` : ". ");
  if (transmissions.length) {
    const auto = transmissions.filter((t) => t !== "manual");
    const autoText = list(auto.map((t) => (t === "automatic" ? "torque-converter automatic" : `${transmissionLabel(t)} automatic`)));
    if (auto.length && transmissions.includes("manual")) perf.push(`You can choose a manual gearbox or ${article(autoText)} ${autoText}.`);
    else if (auto.length) perf.push(`Every variant comes with ${article(autoText)} ${autoText}.`);
  }
  if (perf.length) sections.push({ heading: ev ? `${model} battery and performance` : `${model} engine and performance`, paragraphs: [perf] });

  // Mileage / range
  const mileage = specRange(variants, "Mileage");
  const range = specRange(variants, "Range");
  if (mileage.length || range.length) {
    const p: OverviewSegment[] = [];
    if (mileage.length) p.push(`The claimed fuel efficiency of the ${model} is ${unitRanges(mileage)}, depending on the variant. `);
    if (range.length) p.push(`The claimed driving range is ${rangeText(range)} on a full charge. `);
    p.push("Real-world figures vary with traffic, load, tyre pressure and driving style.");
    sections.push({ heading: ev && !mileage.length ? `${model} range` : `${model} mileage`, paragraphs: [p] });
  }

  // Dimensions & practicality
  const dims: string[] = [];
  const seats = (uniq(variants.map((v) => parseInt(String(spec(v, "Seating") ?? ""), 10)).filter((n) => Number.isFinite(n))) as number[]).sort((a, b) => a - b);
  if (seats.length) dims.push(`seats ${rangeText(seats.map(String))} people`);
  const boot = specRange(variants, "Boot space");
  if (boot.length) dims.push(`offers ${rangeText(boot)} of boot space`);
  const tank = specRange(variants, "Fuel tank");
  if (tank.length && !ev) dims.push(`has a ${rangeText(tank)} fuel tank`);
  const gc = specRange(variants, "Ground clearance");
  if (gc.length) dims.push(`has ${rangeText(gc)} of ground clearance`);
  const sizeBits = ["Length", "Width", "Height", "Wheelbase"]
    .map((k) => [k, specRange(variants, k)[0]] as const)
    .filter(([, v]) => v);
  const weight = specRange(variants, "Kerb weight");
  const dimParas: OverviewSegment[][] = [];
  if (dims.length) dimParas.push([`The ${model} ${list(dims)}.`]);
  if (sizeBits.length) dimParas.push([`Dimensions: ${sizeBits.map(([k, v]) => `${k.toLowerCase()} ${v}`).join(", ")}${weight.length ? `, kerb weight ${rangeText(weight)}` : ""}.`]);
  if (dimParas.length) sections.push({ heading: isCar ? `${model} space and practicality` : `${model} dimensions and practicality`, paragraphs: dimParas });

  // Safety & features
  const airbags = uniq(variants.map((v) => parseInt(String(spec(v, "Airbags") ?? ""), 10)).filter((n) => Number.isFinite(n))).sort((a, b) => a - b);
  const top = to ?? variants[variants.length - 1];
  const featureSections = Object.entries(top?.features ?? {}).filter(([, items]) => items?.length);
  const safetyItems = featureSections.find(([k]) => /safety/i.test(k))?.[1] ?? [];
  const comfortItems = featureSections.find(([k]) => /comfort|convenience|infotainment|entertainment|interior/i.test(k))?.[1] ?? [];
  const safety: OverviewSegment[] = [];
  if (airbags.length) safety.push(airbags.length > 1 ? `Airbag count ranges from ${airbags[0]} to ${airbags[airbags.length - 1]} across the range. ` : `Every variant gets ${airbags[0]} airbags. `);
  const readable = (items: string[]) => items.filter((x) => !x.includes(":") && x.length <= 60).slice(0, 4);
  if (readable(safetyItems).length) safety.push(`The ${top.name} lists safety equipment such as ${list(readable(safetyItems))}. `);
  if (readable(comfortItems).length) safety.push(`Comfort and convenience highlights include ${list(readable(comfortItems))}.`);
  if (safety.length) sections.push({ heading: `${model} safety and features`, paragraphs: [safety] });

  // Colours & warranty
  const extras: OverviewSegment[] = [];
  if (input.colours.length) {
    extras.push(`The ${model} is available in ${input.colours.length} ${input.colours.length === 1 ? "colour" : "colours"}${input.colours.length > 1 ? `, including ${list(input.colours.slice(0, 4))}` : `: ${input.colours[0]}`}. `);
  }
  if (input.warranty) extras.push(`Warranty: ${input.warranty}.`);
  if (extras.length) sections.push({ heading: `${model} colours and warranty`, paragraphs: [extras] });

  // Rivals & compare
  if (input.rivals.length) {
    const rivals = input.rivals.slice(0, 4);
    const p: OverviewSegment[] = [`Rivals of the ${model} in a similar price range include `, ...linkList(rivals.map((r) => ({ text: r.name, href: r.href }))), ". "];
    if (input.compareHref) {
      p.push("Put them side by side: ", ...linkList(rivals.slice(0, 2).map((r) => ({ text: `${model} vs ${r.name.replace(`${brand} `, "")}`, href: input.compareHref!(r.slug) }))), ".");
    }
    sections.push({ heading: `${model} rivals`, paragraphs: [p] });
  }

  // Buying with GroupDrive
  sections.push({
    heading: `Buying the ${model}`,
    paragraphs: [
      [
        `Before you visit a showroom, check the on-road price for your state and ask the dealer for an itemised quotation. On GroupDrive you can also join a free buying group with other people who want the ${model}; authorised dealers then quote for the whole group. Read `,
        { text: "how group buying works", href: "/how-it-works" },
        ", see ",
        { text: "open group deals", href: "/groups" },
        ", or browse ",
        { text: "answers to common questions", href: "/faq" },
        ".",
      ],
    ],
  });

  return sections;
}
