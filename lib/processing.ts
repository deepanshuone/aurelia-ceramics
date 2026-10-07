// Processing time: how many days an order spends being prepared before it
// ships. The admin sets one value for all orders (/admin/settings) and can
// override it on any single order. Days are calendar days, counted from when
// the order was confirmed. No server imports here: the admin forms use these
// constants in the browser (the database lookup is in lib/store-settings.ts).

export const DEFAULT_PROCESSING_DAYS = 3;
export const MAX_PROCESSING_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

type ProcessingOrder = {
  status: string;
  createdAt: Date;
  confirmedAt: Date | null;
  processingDays: number | null;
};

/**
 * Where an order is in its processing time, or null when it isn't being
 * processed (still awaiting payment, already shipped, cancelled, ...).
 */
export function processingProgress(order: ProcessingOrder, storeDays: number, now = new Date()) {
  if (order.status !== "CONFIRMED" && order.status !== "PROCESSING") return null;

  const days = order.processingDays ?? storeDays;
  const startedAt = order.confirmedAt ?? order.createdAt;
  const readyBy = new Date(startedAt.getTime() + days * DAY_MS);
  const elapsed = now.getTime() - startedAt.getTime();
  const percent = days > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / (days * DAY_MS)) * 100))) : 100;

  return {
    days,
    usesStoreDefault: order.processingDays === null,
    startedAt,
    readyBy,
    percent,
    overdue: now > readyBy,
    daysLeft: Math.max(0, Math.ceil((readyBy.getTime() - now.getTime()) / DAY_MS)),
  };
}
