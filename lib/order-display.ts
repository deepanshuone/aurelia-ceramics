import type { OrderStatus, PaymentMethod, PaymentStatus } from "./generated/prisma/enums";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Payment Pending",
  PAID: "Paid",
  FAILED: "Payment Failed",
  REFUNDED: "Refunded",
};

// The happy-path progression shown as a timeline on the order page.
export const ORDER_PROGRESS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export function formatRupees(value: number | { toString(): string }) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatOrderDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

// Admin fulfilment only moves forward. PENDING (unpaid) orders are advanced by
// a successful payment, not by hand; cancellation and refunds have own actions.
export const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  CONFIRMED: ["PROCESSING", "SHIPPED", "DELIVERED"],
  PROCESSING: ["SHIPPED", "DELIVERED"],
  SHIPPED: ["DELIVERED"],
};

export const CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING"];

/** Payment status as customers and admins should read it. */
export function paymentLabel(method: PaymentMethod, status: PaymentStatus) {
  if (method === "COD" && status === "PENDING") return "Cash on Delivery";
  if (method === "COD" && status === "PAID") return "Paid (Cash on Delivery)";
  return PAYMENT_STATUS_LABELS[status];
}
