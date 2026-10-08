import { POLICY } from "./business";

// Expected delivery dates: the order's processing time (calendar days, see
// lib/processing.ts) and then courier transit (POLICY.transitDays, business
// days with Sundays skipped). Dates are India calendar dates.

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** The India calendar date of `instant`, as midnight UTC (read it with UTC getters). */
function istDate(instant: Date) {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

function addBusinessDays(date: Date, days: number) {
  let result = date;
  let added = 0;
  while (added < days) {
    result = new Date(result.getTime() + DAY_MS);
    if (result.getUTCDay() !== 0) added++;
  }
  return result;
}

export type DeliveryEstimate = { earliest: Date; latest: Date };

/** Delivery window for an order confirmed at `confirmedAt` (now, for one not placed yet). */
export function estimateDelivery(processingDays: number, confirmedAt = new Date()): DeliveryEstimate {
  const readyBy = new Date(istDate(confirmedAt).getTime() + Math.max(0, processingDays) * DAY_MS);
  return {
    earliest: addBusinessDays(readyBy, POLICY.transitDays.min),
    latest: addBusinessDays(readyBy, POLICY.transitDays.max),
  };
}

/** e.g. "Tue, 14 Oct – Sat, 18 Oct". */
export function formatDeliveryEstimate({ earliest, latest }: DeliveryEstimate) {
  const format = (date: Date) =>
    date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return `${format(earliest)} – ${format(latest)}`;
}
