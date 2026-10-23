const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPaiseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

export const APP_TIME_ZONE = "Asia/Kolkata";

/** Formats rupees with Indian digit grouping, e.g. ₹12,34,567. */
export function formatINR(value: number | string | null | undefined, opts: { paise?: boolean } = {}) {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  const usePaise = opts.paise ?? !Number.isInteger(Math.round(n * 100) / 100);
  return (usePaise ? inrPaiseFormatter : inrFormatter).format(n);
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return numberFormatter.format(value);
}

/** Compact Indian units for headlines: 7.5 lakh, 1.2 crore. */
export function formatINRCompact(value: number) {
  if (value >= 1e7) return `₹${trim(value / 1e7)} crore`;
  if (value >= 1e5) return `₹${trim(value / 1e5)} lakh`;
  return formatINR(value);
}

function trim(n: number) {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
    ...opts,
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  return formatDate(value, { hour: "2-digit", minute: "2-digit", hour12: true });
}

/** "3 days left", "5 hours left", "Closed". */
export function timeRemaining(deadline: string | Date, now: Date = new Date()) {
  const ms = new Date(deadline).getTime() - now.getTime();
  if (ms <= 0) return "Deadline passed";
  const hours = Math.floor(ms / 36e5);
  if (hours < 1) return "Less than an hour left";
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} left`;
  const days = Math.floor(hours / 24);
  return `${days} days left`;
}

/** Today's date in India as YYYY-MM-DD. */
export function todayInIndia(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(now);
}

/** Interprets a `datetime-local` value (no zone) as India time and returns ISO-8601 UTC. */
export function istLocalToISO(value: string) {
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value.length === 16 ? `${value}:00` : value}+05:30`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date.toISOString();
}

/** ISO timestamp → `datetime-local` value in India time. */
export function isoToISTLocal(iso: string) {
  const d = new Date(new Date(iso).getTime() + 5.5 * 36e5);
  return d.toISOString().slice(0, 16);
}

/** Date `days` ago in India as YYYY-MM-DD. */
export function dateDaysAgo(days: number, now: Date = new Date()) {
  return todayInIndia(new Date(now.getTime() - days * 864e5));
}

/** ISO timestamp `days` from now. */
export function isoDaysFromNow(days: number, now: Date = new Date()) {
  return new Date(now.getTime() + days * 864e5).toISOString();
}
