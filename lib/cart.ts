// Shared cart types plus the guest (logged-out) cart stored in localStorage.
// Guests only persist slug + quantity; everything else is fetched live from
// the server so prices and stock can never be stale or tampered with.

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  mrp: number | null;
  image: string;
  stock: number;
  quantity: number;
  available: boolean;
};

export type CartResponse = {
  items: CartLine[];
  notices: string[];
};

export type GuestCartItem = {
  slug: string;
  quantity: number;
};

import { gstOn } from "./pricing";

const CART_KEY = "aurelia-cart";

/** Delivery pricing in rupees. Admins edit it under Admin → Settings. */
export type DeliveryRules = {
  /** Orders with merchandise worth this much or more ship free. */
  freeDeliveryThreshold: number;
  /** Flat charge on orders below the threshold. */
  deliveryFee: number;
};

/** Used until an admin saves their own values. */
export const DEFAULT_DELIVERY_RULES: DeliveryRules = { freeDeliveryThreshold: 999, deliveryFee: 99 };

export function deliveryCharge(subtotal: number, rules: DeliveryRules) {
  return subtotal <= 0 || subtotal >= rules.freeDeliveryThreshold ? 0 : rules.deliveryFee;
}

export function getCartTotals(items: CartLine[], rules: DeliveryRules) {
  const subtotal = items
    .filter((item) => item.available)
    .reduce((total, item) => total + item.price * item.quantity, 0);
  const delivery = deliveryCharge(subtotal, rules);
  const gst = gstOn(subtotal);
  return { subtotal, delivery, gst, total: Math.round((subtotal + delivery + gst) * 100) / 100 };
}

export function readGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    // Older builds stored full product snapshots here; keep only what we trust.
    return parsed
      .filter(
        (item): item is GuestCartItem =>
          typeof item?.slug === "string" &&
          Number.isInteger(item?.quantity) &&
          item.quantity > 0
      )
      .map(({ slug, quantity }) => ({ slug, quantity }));
  } catch {
    return [];
  }
}

export function writeGuestCart(items: GuestCartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked; the in-memory cart still works for this visit.
  }
}

export function clearGuestCart() {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    // ignore
  }
}
