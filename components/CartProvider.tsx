"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import {
  CartLine,
  CartResponse,
  DeliveryRules,
  GuestCartItem,
  clearGuestCart,
  readGuestCart,
  writeGuestCart,
} from "../lib/cart";

type MutationResult = { ok: true } | { ok: false; error: string };

type CartContextValue = {
  items: CartLine[];
  count: number;
  loading: boolean;
  /** Delivery pricing from Admin → Settings, for showing charges in the cart. */
  delivery: DeliveryRules;
  notices: string[];
  dismissNotices: () => void;
  addItem: (slug: string, quantity: number) => Promise<MutationResult>;
  updateQuantity: (slug: string, quantity: number) => Promise<MutationResult>;
  removeItem: (slug: string) => Promise<MutationResult>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

async function requestCart(url: string, init?: RequestInit): Promise<CartResponse> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "Could not update your cart. Please try again.");
  }
  return data as CartResponse;
}

function toGuestItems(items: CartLine[]): GuestCartItem[] {
  return items
    .filter((item) => item.quantity > 0)
    .map(({ slug, quantity }) => ({ slug, quantity }));
}

export default function CartProvider({
  children,
  delivery,
}: {
  children: React.ReactNode;
  delivery: DeliveryRules;
}) {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<string[]>([]);

  // Ignore responses that arrive after a newer request has been issued.
  const requestId = useRef(0);

  const apply = useCallback((cart: CartResponse, id: number, persistGuest: boolean) => {
    if (id !== requestId.current) return;
    setItems(cart.items);
    if (cart.notices.length > 0) setNotices(cart.notices);
    if (persistGuest) writeGuestCart(toGuestItems(cart.items));
  }, []);

  const validateGuest = useCallback(
    (guestItems: GuestCartItem[]) =>
      requestCart("/api/cart/validate", {
        method: "POST",
        body: JSON.stringify({ items: guestItems }),
      }),
    []
  );

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      if (isLoggedIn) {
        const guestItems = readGuestCart();
        const cart =
          guestItems.length > 0
            ? await requestCart("/api/cart/merge", {
                method: "POST",
                body: JSON.stringify({ items: guestItems }),
              })
            : await requestCart("/api/cart");
        if (guestItems.length > 0) clearGuestCart();
        apply(cart, id, false);
      } else {
        const guestItems = readGuestCart();
        const cart = guestItems.length > 0 ? await validateGuest(guestItems) : { items: [], notices: [] };
        apply(cart, id, true);
      }
    } catch {
      // Keep whatever we had; the next action will retry against the server.
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [isLoggedIn, apply, validateGuest]);

  useEffect(() => {
    if (status === "loading") return;
    load();
  }, [status, load]);

  // Keep guest carts in sync across tabs.
  useEffect(() => {
    if (isLoggedIn) return;
    function onStorage(event: StorageEvent) {
      if (event.key === "aurelia-cart") load();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isLoggedIn, load]);

  const mutate = useCallback(
    async (
      remote: () => Promise<CartResponse>,
      guest: (current: GuestCartItem[]) => GuestCartItem[]
    ): Promise<{ ok: true; cart: CartResponse } | { ok: false; error: string }> => {
      const id = ++requestId.current;
      try {
        const cart = isLoggedIn ? await remote() : await validateGuest(guest(readGuestCart()));
        apply(cart, id, !isLoggedIn);
        return { ok: true, cart };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
      }
    },
    [isLoggedIn, apply, validateGuest]
  );

  const addItem = useCallback(
    async (slug: string, quantity: number): Promise<MutationResult> => {
      const result = await mutate(
        () => requestCart("/api/cart", { method: "POST", body: JSON.stringify({ slug, quantity }) }),
        (current) => {
          const existing = current.find((item) => item.slug === slug);
          return existing
            ? current.map((item) =>
                item.slug === slug ? { ...item, quantity: item.quantity + quantity } : item
              )
            : [...current, { slug, quantity }];
        }
      );
      if (!result.ok) return result;

      // The logged-in API rejects out-of-stock adds with 409; the guest
      // validate endpoint keeps such lines, so report them the same way.
      const line = result.cart.items.find((item) => item.slug === slug);
      if (line && !line.available) {
        return { ok: false as const, error: `${line.name} is out of stock.` };
      }
      return { ok: true as const };
    },
    [mutate]
  );

  const updateQuantity = useCallback(
    (slug: string, quantity: number) =>
      mutate(
        () => requestCart("/api/cart", { method: "PATCH", body: JSON.stringify({ slug, quantity }) }),
        (current) =>
          current
            .map((item) => (item.slug === slug ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0)
      ),
    [mutate]
  );

  const removeItem = useCallback(
    (slug: string) =>
      mutate(
        () => requestCart(`/api/cart?slug=${encodeURIComponent(slug)}`, { method: "DELETE" }),
        (current) => current.filter((item) => item.slug !== slug)
      ),
    [mutate]
  );

  const clearCart = useCallback(async () => {
    requestId.current++;
    setItems([]);
    if (isLoggedIn) {
      await requestCart("/api/cart", { method: "DELETE" }).catch(() => undefined);
    } else {
      clearGuestCart();
    }
  }, [isLoggedIn]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((total, item) => total + (item.available ? item.quantity : 0), 0),
      loading,
      delivery,
      notices,
      dismissNotices: () => setNotices([]),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      refresh: load,
    }),
    [items, loading, delivery, notices, addItem, updateQuantity, removeItem, clearCart, load]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>.");
  return context;
}
