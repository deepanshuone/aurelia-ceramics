import { createHmac, timingSafeEqual } from "crypto";
import { auth } from "../auth";
import { orderDetailPath } from "./order-links";
import { getSiteUrl } from "./site";

// Who may open an order: the signed-in customer it belongs to, or anyone
// holding its signed link. Guest checkout orders have no account, so the link
// (shown after checkout, saved on the device and sent in every order email)
// is their only key. The order ID alone is never enough.

function secret() {
  const value = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!value) throw new Error("NEXTAUTH_SECRET is not set.");
  return value;
}

/** Unguessable token that unlocks one order. Stable, so emailed links keep working. */
export function orderAccessToken(orderId: string) {
  return createHmac("sha256", secret()).update(`order-access:${orderId}`).digest("base64url").slice(0, 32);
}

export function isValidOrderAccessToken(orderId: string, token: string | null | undefined) {
  if (!token) return false;
  const expected = Buffer.from(orderAccessToken(orderId));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Absolute link for emails: account page for customers, signed link for guests. */
export function orderPageUrl(order: { orderId: string; customerId: string | null }) {
  const token = order.customerId ? undefined : orderAccessToken(order.orderId);
  return `${getSiteUrl()}${orderDetailPath(order.orderId, token)}`;
}

/** An order the visitor may act on: `orderId`, plus `customerId` when access comes from their login. */
export type OrderAccess = { orderId: string; customerId?: string };

/**
 * Prisma filter for an order the current visitor may see, or null. A valid
 * token opens the order; otherwise it must belong to the signed-in customer.
 */
export async function orderAccessWhere(orderId: string, token?: string | null): Promise<OrderAccess | null> {
  if (isValidOrderAccessToken(orderId, token)) return { orderId };
  const session = await auth();
  const customerId = session?.user?.id;
  return customerId ? { orderId, customerId } : null;
}
