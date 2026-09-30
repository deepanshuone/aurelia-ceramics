import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";
import { prisma } from "./prisma";
import { releaseOrderInventory } from "./order-inventory";

// Unpaid orders hold stock; after this long they are cancelled and released.
export const PAYMENT_WINDOW_MINUTES = 30;
export const EXPIRED_REASON = "Payment was not completed in time";

export class PaymentError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** True when Razorpay keys are set, i.e. "Pay Online" can be offered. */
export function isOnlinePaymentConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function getConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new PaymentError("Online payments are not configured yet. Please contact us to complete your order.", 503);
  }
  return { keyId, keySecret };
}

let client: Razorpay | null = null;
function getClient() {
  const { keyId, keySecret } = getConfig();
  client ??= new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

const toPaise = (value: { toString(): string }) => Math.round(Number(value) * 100);

function safeEqualHex(expected: string, received: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Signature Razorpay Checkout returns to the browser after a successful payment. */
export function verifyCheckoutSignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string) {
  const { keySecret } = getConfig();
  const expected = createHmac("sha256", keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** X-Razorpay-Signature on webhooks: HMAC of the raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new PaymentError("Webhook secret is not configured.", 503);
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

function paymentDeadline(createdAt: Date) {
  return new Date(createdAt.getTime() + PAYMENT_WINDOW_MINUTES * 60_000);
}

export function isPaymentWindowOpen(order: { createdAt: Date }) {
  return paymentDeadline(order.createdAt) > new Date();
}

/**
 * Cancels unpaid orders older than the payment window and returns their stock
 * and coupon usage. Each order is released in its own transaction guarded by a
 * conditional update, so a payment confirming at the same moment wins cleanly.
 */
export async function expireStaleOrders(customerId?: string) {
  const cutoff = new Date(Date.now() - PAYMENT_WINDOW_MINUTES * 60_000);

  const stale = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: { in: ["PENDING", "FAILED"] },
      createdAt: { lt: cutoff },
      ...(customerId ? { customerId } : {}),
    },
    select: { id: true },
    take: 100,
  });

  let expired = 0;
  for (const { id } of stale) {
    const released = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, status: "PENDING", paymentMethod: "ONLINE", paymentStatus: { in: ["PENDING", "FAILED"] } },
        data: { status: "CANCELLED", cancelReason: EXPIRED_REASON },
      });
      if (claimed.count === 0) return false;

      await releaseOrderInventory(tx, id);
      return true;
    });
    if (released) expired++;
  }
  return expired;
}

/**
 * Returns the Razorpay order to pay for one of the customer's orders, creating
 * it (from the database total, never a client-supplied amount) on first use.
 */
export async function startPayment(customerId: string, orderId: string) {
  const { keyId } = getConfig();

  await expireStaleOrders(customerId);

  const order = await prisma.order.findFirst({
    where: { orderId, customerId },
    include: { payment: true },
  });

  if (!order) throw new PaymentError("Order not found.", 404);
  if (order.paymentMethod === "COD") throw new PaymentError("This order is Cash on Delivery.", 409);
  if (order.paymentStatus === "PAID") throw new PaymentError("This order has already been paid.", 409);
  if (order.status !== "PENDING" || !isPaymentWindowOpen(order)) {
    throw new PaymentError("This order has expired. Please place a new order.", 409);
  }

  const amount = toPaise(order.total);
  let razorpayOrderId = order.payment?.razorpayOrderId;

  if (!razorpayOrderId) {
    const created = await getClient().orders.create({
      amount,
      currency: "INR",
      receipt: order.orderId,
      notes: { orderId: order.orderId },
    });

    try {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: created.id,
          amount: order.total,
          currency: "INR",
        },
      });
      razorpayOrderId = created.id;
    } catch (error) {
      // A concurrent request (double click, two tabs) created the Payment
      // first; use its Razorpay order so there is only ever one per order.
      const existing = await prisma.payment.findUnique({ where: { orderId: order.id } });
      if (!existing) throw error;
      razorpayOrderId = existing.razorpayOrderId;
    }
  }

  return {
    keyId,
    razorpayOrderId,
    amount,
    currency: "INR",
    orderId: order.orderId,
    prefill: {
      name: order.shippingName ?? undefined,
      email: order.shippingEmail ?? undefined,
      contact: order.shippingPhone ?? undefined,
    },
  };
}

/**
 * Marks a Razorpay order as paid. Idempotent: safe to call from both the
 * browser verification route and the webhook, in either order.
 */
export async function markPaymentCaptured(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature?: string;
  amountPaise?: number;
  rawWebhookPayload?: object;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
      select: { id: true, orderId: true, status: true, amount: true },
    });
    if (!payment) return { found: false as const };
    if (payment.status === "PAID") return { found: true as const, orderRowId: payment.orderId };

    // Razorpay fixes the amount on the order we created, but check anyway.
    if (input.amountPaise !== undefined && input.amountPaise !== toPaise(payment.amount)) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          failureReason: `Amount mismatch: received ${input.amountPaise} paise`,
          rawWebhookPayload: input.rawWebhookPayload,
        },
      });
      return { found: true as const, orderRowId: payment.orderId, mismatch: true };
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.signature,
        failureReason: null,
        ...(input.rawWebhookPayload ? { rawWebhookPayload: input.rawWebhookPayload } : {}),
      },
    });

    const confirmed = await tx.order.updateMany({
      where: { id: payment.orderId, status: "PENDING" },
      data: { status: "CONFIRMED", paymentStatus: "PAID" },
    });

    if (confirmed.count === 0) {
      // The order was already cancelled (e.g. payment window expired) and its
      // stock released. Keep the money on record and flag it for a refund.
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: "PAID",
          cancelReason: "Payment received after the order was cancelled — refund pending",
        },
      });
    }

    return { found: true as const, orderRowId: payment.orderId };
  });
}

export async function markPaymentFailed(input: {
  razorpayOrderId: string;
  reason: string;
  rawWebhookPayload?: object;
}) {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
    select: { id: true, orderId: true, status: true },
  });
  if (!payment || payment.status === "PAID") return;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: input.reason, rawWebhookPayload: input.rawWebhookPayload },
    }),
    // A failed attempt can still be retried on the same Razorpay order.
    prisma.order.updateMany({
      where: { id: payment.orderId, paymentStatus: { not: "PAID" } },
      data: { paymentStatus: "FAILED" },
    }),
  ]);
}

/** Issues a refund through Razorpay. Throws PaymentError if unconfigured. */
export async function refundRazorpayPayment(razorpayPaymentId: string, amountPaise: number, orderId: string) {
  const refund = await getClient().payments.refund(razorpayPaymentId, {
    amount: amountPaise,
    notes: { orderId },
  });
  return refund.id;
}
