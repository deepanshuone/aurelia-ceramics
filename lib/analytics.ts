// Ad and analytics tracking: Meta Pixel (Facebook/Instagram ads) and the
// Google tag (GA4 and/or Google Ads). Each one only loads when its ID is set
// in the environment, so with nothing configured the site sends nothing.
// NEXT_PUBLIC_* values are baked in at build time: redeploy after changing them.

const clean = (value: string | undefined, pattern: RegExp) => {
  const trimmed = value?.trim();
  return trimmed && pattern.test(trimmed) ? trimmed : undefined;
};

export const META_PIXEL_ID = clean(process.env.NEXT_PUBLIC_META_PIXEL_ID, /^\d{6,20}$/);
export const GA_MEASUREMENT_ID = clean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, /^G-[A-Z0-9]+$/i);
export const GOOGLE_ADS_ID = clean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID, /^AW-\d+$/i);
/** The "Purchase" conversion's label from Google Ads (the part after the slash). */
const GOOGLE_ADS_PURCHASE_LABEL = clean(process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL, /^[\w-]+$/);

export const GOOGLE_TAG_ID = GA_MEASUREMENT_ID ?? GOOGLE_ADS_ID;
export const TRACKING_ENABLED = Boolean(META_PIXEL_ID || GOOGLE_TAG_ID);

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export type TrackedItem = { id: string; name: string; price: number; quantity: number };

// The tags load after the page is interactive, so an event fired straight
// away (e.g. viewing a product) waits a few seconds for them before giving up.
function whenLoaded(name: "fbq" | "gtag", args: unknown[], triesLeft = 50) {
  const send = window[name];
  if (send) send(...args);
  else if (triesLeft > 0) setTimeout(() => whenLoaded(name, args, triesLeft - 1), 100);
}

function fbq(...args: unknown[]) {
  if (META_PIXEL_ID && typeof window !== "undefined") whenLoaded("fbq", args);
}

function gtag(...args: unknown[]) {
  if (GOOGLE_TAG_ID && typeof window !== "undefined") whenLoaded("gtag", args);
}

const valueOf = (items: TrackedItem[]) =>
  Math.round(items.reduce((total, item) => total + item.price * item.quantity, 0) * 100) / 100;

const googleItems = (items: TrackedItem[]) =>
  items.map((item) => ({ item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity }));

const metaContents = (items: TrackedItem[]) =>
  items.map((item) => ({ id: item.id, quantity: item.quantity, item_price: item.price }));

/** Meta needs this for page views after client-side navigation; GA4 tracks those itself. */
export function trackPageView() {
  fbq("track", "PageView");
}

export function trackViewItem(item: Omit<TrackedItem, "quantity">) {
  fbq("track", "ViewContent", {
    content_ids: [item.id],
    content_name: item.name,
    content_type: "product",
    value: item.price,
    currency: "INR",
  });
  gtag("event", "view_item", { currency: "INR", value: item.price, items: googleItems([{ ...item, quantity: 1 }]) });
}

export function trackAddToCart(item: TrackedItem) {
  const items = [item];
  fbq("track", "AddToCart", {
    content_ids: [item.id],
    contents: metaContents(items),
    content_type: "product",
    value: valueOf(items),
    currency: "INR",
  });
  gtag("event", "add_to_cart", { currency: "INR", value: valueOf(items), items: googleItems(items) });
}

export function trackBeginCheckout(items: TrackedItem[]) {
  fbq("track", "InitiateCheckout", {
    content_ids: items.map((item) => item.id),
    contents: metaContents(items),
    content_type: "product",
    num_items: items.reduce((total, item) => total + item.quantity, 0),
    value: valueOf(items),
    currency: "INR",
  });
  gtag("event", "begin_checkout", { currency: "INR", value: valueOf(items), items: googleItems(items) });
}

const PURCHASE_KEY = "aurelia-tracked-orders";

/**
 * Reports a confirmed order once per browser, so reopening or refreshing the
 * order page doesn't count the sale again. The order ID also lets Meta and
 * Google drop duplicates on their side.
 */
export function trackPurchase(orderId: string, total: number, items: TrackedItem[]) {
  if (!TRACKING_ENABLED || typeof window === "undefined") return;

  let tracked: string[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PURCHASE_KEY) ?? "[]");
    if (Array.isArray(parsed)) tracked = parsed.filter((id): id is string => typeof id === "string");
  } catch {
    // Unreadable storage: track anyway; the order ID still de-duplicates.
  }
  if (tracked.includes(orderId)) return;

  fbq(
    "track",
    "Purchase",
    {
      content_ids: items.map((item) => item.id),
      contents: metaContents(items),
      content_type: "product",
      num_items: items.reduce((total, item) => total + item.quantity, 0),
      value: total,
      currency: "INR",
    },
    { eventID: orderId }
  );
  gtag("event", "purchase", { transaction_id: orderId, currency: "INR", value: total, items: googleItems(items) });
  if (GOOGLE_ADS_ID && GOOGLE_ADS_PURCHASE_LABEL) {
    gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_PURCHASE_LABEL}`,
      value: total,
      currency: "INR",
      transaction_id: orderId,
    });
  }

  try {
    localStorage.setItem(PURCHASE_KEY, JSON.stringify([...tracked, orderId].slice(-50)));
  } catch {
    // Storage full or blocked; nothing else to do.
  }
}
