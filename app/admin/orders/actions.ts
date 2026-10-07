"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { type ActionState, firstIssue, optionalText, requireAdmin, requireEditor } from "../../../lib/admin";
import { CANCELLABLE_STATUSES as CANCELLABLE, NEXT_STATUSES } from "../../../lib/order-display";
import { releaseOrderInventory } from "../../../lib/order-inventory";
import { MAX_PROCESSING_DAYS } from "../../../lib/processing";
import { type OrderStatusEmail, sendOrderStatusEmail } from "../../../lib/order-status-emails";
import { PaymentError, refundRazorpayPayment } from "../../../lib/payments";
import { prisma } from "../../../lib/prisma";

const toPaise = (value: { toString(): string }) => Math.round(Number(value) * 100);

function refresh(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

// Tells the customer about the change once the response has been sent; a mail
// problem can never undo or delay what the admin just did.
function notifyCustomer(orderRowId: string, event: OrderStatusEmail) {
  after(() => sendOrderStatusEmail(orderRowId, event).then(() => undefined));
}

async function loadOrder(orderRowId: string) {
  return prisma.order.findUnique({
    where: { id: orderRowId },
    include: { payment: true },
  });
}

const statusSchema = z.object({
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED"], { message: "Choose a valid status." }),
});

export async function updateOrderStatus(
  orderRowId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireEditor();

  const parsed = statusSchema.safeParse({ status: formData.get("status") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const order = await loadOrder(orderRowId);
  if (!order) return { error: "Order not found." };

  const allowed = NEXT_STATUSES[order.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return { error: `An order that is ${order.status.toLowerCase()} can't be moved to ${parsed.data.status.toLowerCase()}.` };
  }

  // Conditional on the status we validated against, in case another admin
  // changed it in the meantime.
  const updated = await prisma.order.updateMany({
    where: { id: order.id, status: order.status },
    data: {
      status: parsed.data.status,
      // Cash on Delivery is collected when the order is handed over.
      ...(order.paymentMethod === "COD" && parsed.data.status === "DELIVERED" ? { paymentStatus: "PAID" as const } : {}),
    },
  });
  if (updated.count === 0) return { error: "This order was just updated by someone else. Refresh and try again." };

  refresh(order.orderId);
  if (parsed.data.status === "SHIPPED" || parsed.data.status === "DELIVERED") {
    notifyCustomer(order.id, { kind: parsed.data.status });
  }
  return { success: "Status updated." };
}

const processingSchema = z.object({
  processingDays: z
    .string()
    .trim()
    .transform((value, ctx) => {
      // Blank means "use the store-wide processing time".
      if (!value) return null;
      const days = Number(value);
      if (!Number.isInteger(days) || days < 0 || days > MAX_PROCESSING_DAYS) {
        ctx.addIssue({ code: "custom", message: `Enter a whole number of days from 0 to ${MAX_PROCESSING_DAYS}.` });
        return z.NEVER;
      }
      return days;
    }),
});

export async function updateProcessingDays(
  orderRowId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireEditor();

  const parsed = processingSchema.safeParse({ processingDays: formData.get("processingDays") ?? "" });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const order = await prisma.order.findUnique({ where: { id: orderRowId }, select: { orderId: true } });
  if (!order) return { error: "Order not found." };

  await prisma.order.update({
    where: { id: orderRowId },
    data: { processingDays: parsed.data.processingDays },
  });

  refresh(order.orderId);
  revalidatePath(`/account/orders/${order.orderId}`);
  return {
    success:
      parsed.data.processingDays === null
        ? "This order now uses the store-wide processing time."
        : `Processing time for this order set to ${parsed.data.processingDays} day${parsed.data.processingDays === 1 ? "" : "s"}.`,
  };
}

const trackingSchema = z.object({
  trackingCarrier: optionalText(60),
  trackingNumber: optionalText(80),
});

export async function updateTracking(
  orderRowId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireEditor();

  const parsed = trackingSchema.safeParse({
    trackingCarrier: formData.get("trackingCarrier") ?? "",
    trackingNumber: formData.get("trackingNumber") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const before = await prisma.order.findUnique({
    where: { id: orderRowId },
    select: { trackingCarrier: true, trackingNumber: true },
  });
  if (!before) return { error: "Order not found." };

  const order = await prisma.order.update({
    where: { id: orderRowId },
    data: parsed.data,
    select: { id: true, orderId: true, status: true, trackingNumber: true, trackingCarrier: true },
  });

  refresh(order.orderId);
  // Once an order has shipped, new or changed tracking details are worth an email.
  const changed = order.trackingNumber !== before.trackingNumber || order.trackingCarrier !== before.trackingCarrier;
  if (order.status === "SHIPPED" && order.trackingNumber && changed) {
    notifyCustomer(order.id, { kind: "TRACKING" });
  }
  return { success: "Tracking details saved." };
}

const cancelSchema = z.object({
  reason: z.string().trim().min(3, "Please give a reason for cancelling.").max(300),
});

export async function cancelOrder(
  orderRowId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireEditor();

  const parsed = cancelSchema.safeParse({ reason: formData.get("reason") ?? "" });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const order = await loadOrder(orderRowId);
  if (!order) return { error: "Order not found." };
  if (!CANCELLABLE.includes(order.status)) {
    return { error: "Only orders that haven't shipped yet can be cancelled." };
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: { in: CANCELLABLE } },
      data: { status: "CANCELLED", cancelReason: parsed.data.reason },
    });
    if (claimed.count === 0) return false;
    await releaseOrderInventory(tx, order.id);
    return true;
  });

  if (!cancelled) return { error: "This order was just updated by someone else. Refresh and try again." };

  refresh(order.orderId);
  notifyCustomer(order.id, { kind: "CANCELLED" });
  return {
    success:
      order.paymentStatus === "PAID"
        ? "Order cancelled and stock released. The customer has paid — issue a refund below."
        : "Order cancelled and stock released.",
  };
}

const refundSchema = z.object({
  amount: z.coerce
    .number({ message: "Enter the refund amount." })
    .positive("Refund amount must be more than zero."),
  method: z.enum(["razorpay", "manual"]),
});

export async function refundOrder(
  orderRowId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Refunds move money, so they are for full admins only.
  await requireAdmin();

  const parsed = refundSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const order = await loadOrder(orderRowId);
  if (!order) return { error: "Order not found." };
  if (order.paymentStatus !== "PAID") return { error: "Only paid orders can be refunded." };

  const amountPaise = Math.round(parsed.data.amount * 100);
  const refundedPaise = toPaise(order.refundedAmount);
  const remainingPaise = toPaise(order.total) - refundedPaise;

  if (amountPaise > remainingPaise) {
    return { error: `You can refund at most ₹${(remainingPaise / 100).toLocaleString("en-IN")}.` };
  }

  const isFullRefund = amountPaise === remainingPaise;
  if (isFullRefund && order.status !== "CANCELLED" && order.status !== "DELIVERED") {
    return { error: "Cancel the order first (this releases its stock), then issue the full refund." };
  }

  if (parsed.data.method === "razorpay") {
    const paymentId = order.payment?.razorpayPaymentId;
    if (!paymentId) {
      return { error: "No Razorpay payment is recorded for this order. Refund it manually instead." };
    }
    try {
      await refundRazorpayPayment(paymentId, amountPaise, order.orderId);
    } catch (error) {
      if (error instanceof PaymentError) return { error: error.message };
      const description = (error as { error?: { description?: string } })?.error?.description;
      console.error("Razorpay refund failed", error);
      return { error: `Razorpay refund failed${description ? `: ${description}` : "."}` };
    }
  }

  const newRefunded = (refundedPaise + amountPaise) / 100;

  // Guarded on the refunded amount we read, so two admins can't both record
  // a refund against the same balance.
  const recorded = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, refundedAmount: order.refundedAmount },
      data: {
        refundedAmount: newRefunded,
        ...(isFullRefund ? { paymentStatus: "REFUNDED", status: "REFUNDED" } : {}),
      },
    });
    if (updated.count === 0) return false;

    if (isFullRefund && order.payment) {
      await tx.payment.update({ where: { id: order.payment.id }, data: { status: "REFUNDED" } });
    }
    return true;
  });

  if (!recorded) {
    return {
      error:
        parsed.data.method === "razorpay"
          ? "The Razorpay refund went through, but another refund was recorded at the same time. Check the Razorpay dashboard and this order's refunded amount."
          : "Another refund was just recorded for this order. Refresh and try again.",
    };
  }

  refresh(order.orderId);
  notifyCustomer(order.id, { kind: "REFUNDED", amount: amountPaise / 100, full: isFullRefund, method: parsed.data.method });
  return {
    success: `${isFullRefund ? "Full" : "Partial"} refund of ₹${parsed.data.amount.toLocaleString("en-IN")} recorded${parsed.data.method === "razorpay" ? " and sent via Razorpay" : ""}.`,
  };
}
