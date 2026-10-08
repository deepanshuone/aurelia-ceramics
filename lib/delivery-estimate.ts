import { POLICY } from "./business";

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = "Asia/Kolkata";

/** Adds business days (Mon–Sat; couriers don't deliver on Sundays). */
function addBusinessDays(start: Date, days: number) {
  const date = new Date(start);
  let left = days;
  while (left > 0) {
    date.setTime(date.getTime() + DAY_MS);
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(date);
    if (weekday !== "Sun") left -= 1;
  }
  return date;
}

/**
 * When an order placed now should arrive: the store's processing time
 * (calendar days, as in lib/processing.ts) plus courier transit time.
 */
export function estimateDelivery(processingDays: number, now = new Date()) {
  const dispatchBy = new Date(now.getTime() + processingDays * DAY_MS);
  return {
    earliest: addBusinessDays(dispatchBy, POLICY.transitDays.min),
    latest: addBusinessDays(dispatchBy, POLICY.transitDays.max),
  };
}

/** "Mon, 13 Oct" in Indian time. */
export function formatDeliveryDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

/** e.g. "Tue, 14 Oct – Sat, 18 Oct", for checkout and order pages. */
export function formatDeliveryEstimate({ earliest, latest }: { earliest: Date; latest: Date }) {
  return `${formatDeliveryDate(earliest)} – ${formatDeliveryDate(latest)}`;
}
