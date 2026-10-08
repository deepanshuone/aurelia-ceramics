// Links to an order's pages, safe to use in the browser. Guest checkout orders
// carry their signed token (lib/order-access.ts) in the link; account orders
// don't need one.

export function orderSuccessPath(orderId: string, token?: string, payment?: "failed" | "pending") {
  const params = new URLSearchParams({ orderId });
  if (token) params.set("t", token);
  if (payment) params.set("payment", payment);
  return `/order-success?${params}`;
}

export function orderDetailPath(orderId: string, token?: string) {
  return token
    ? `/track-order/${encodeURIComponent(orderId)}?t=${encodeURIComponent(token)}`
    : `/account/orders/${encodeURIComponent(orderId)}`;
}

// Guest orders placed in this browser, so "Track order" can list them without
// a login. Only the order ID, its link token and the date are kept.

export type DeviceOrder = { orderId: string; token: string; placedAt: string };

const DEVICE_ORDERS_KEY = "aurelia-guest-orders";
const MAX_DEVICE_ORDERS = 10;

export function readDeviceOrders(): DeviceOrder[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DEVICE_ORDERS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is DeviceOrder =>
        typeof entry?.orderId === "string" && typeof entry?.token === "string" && typeof entry?.placedAt === "string"
    );
  } catch {
    return [];
  }
}

export function rememberDeviceOrder(orderId: string, token: string) {
  try {
    const others = readDeviceOrders().filter((entry) => entry.orderId !== orderId);
    const next = [{ orderId, token, placedAt: new Date().toISOString() }, ...others].slice(0, MAX_DEVICE_ORDERS);
    localStorage.setItem(DEVICE_ORDERS_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the order is still reachable from its email link.
  }
}
