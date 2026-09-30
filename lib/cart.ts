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

const CART_KEY = "aurelia-cart";

export const FREE_DELIVERY_THRESHOLD = 2000;
export const DELIVERY_FEE = 99;

export function getCartTotals(items: CartLine[]) {
  const subtotal = items
    .filter((item) => item.available)
    .reduce((total, item) => total + item.price * item.quantity, 0);
  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  return { subtotal, delivery, total: subtotal + delivery };
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
