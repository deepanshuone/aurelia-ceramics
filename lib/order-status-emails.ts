import { BUSINESS, POLICY } from "./business";
import { sendEmail } from "./email";
import { emailLayout, escapeHtml as esc } from "./email-layout";
import { prisma } from "./prisma";
import { getSiteUrl } from "./site";

// Emails the customer receives as an admin moves their order along:
// shipped, tracking added, delivered, cancelled and refunded.
export type OrderStatusEmail =
  | { kind: "SHIPPED" }
  | { kind: "TRACKING" }
  | { kind: "DELIVERED" }
  | { kind: "CANCELLED" }
  | { kind: "REFUNDED"; amount: number; full: boolean; method: "razorpay" | "manual" };

const rupees = (value: { toString(): string } | number) => {
  const amount = Number(value);
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
};

function loadOrder(orderRowId: string) {
  return prisma.order.findUnique({
    where: { id: orderRowId },
    include: { items: { orderBy: { createdAt: "asc" }, select: { name: true, quantity: true } } },
  });
}

type OrderRow = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

export function buildOrderStatusEmail(order: OrderRow, event: OrderStatusEmail) {
  const firstName = (order.shippingName ?? "").trim().split(/\s+/)[0] || "there";
  const orderUrl = `${getSiteUrl()}/account/orders/${encodeURIComponent(order.orderId)}`;
  const items = order.items.map((item) => `${item.quantity} × ${item.name}`);
  const itemsHtml = `<ul style="margin:10px 0 0;padding-left:20px;color:#46423c;">${items.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>`;
  const idLine = `<p style="margin:0 0 8px;color:#746f67;font-size:13px;">Order ID: <strong style="color:#171614;">${esc(order.orderId)}</strong></p>`;
  const tracking =
    order.trackingNumber != null && order.trackingNumber !== ""
      ? { carrier: order.trackingCarrier ?? "", number: order.trackingNumber }
      : null;
  const trackingHtml = tracking
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;margin:14px 0 0;"><tr><td style="padding:14px 16px;font-size:14px;color:#46423c;">
        ${tracking.carrier ? `Courier: <strong style="color:#171614;">${esc(tracking.carrier)}</strong><br>` : ""}Tracking number: <strong style="color:#171614;">${esc(tracking.number)}</strong></td></tr></table>`
    : "";
  const trackingText = tracking ? [``, `${tracking.carrier ? `Courier: ${tracking.carrier} · ` : ""}Tracking number: ${tracking.number}`] : [];
  const codNote =
    order.paymentMethod === "COD" && order.paymentStatus !== "PAID"
      ? `<p style="margin:14px 0 0;">This is a Cash on Delivery order — please keep <strong>${rupees(order.total)}</strong> ready (cash or UPI).</p>`
      : "";
  const codText = order.paymentMethod === "COD" && order.paymentStatus !== "PAID" ? [``, `This is a Cash on Delivery order — please keep ${rupees(order.total)} ready (cash or UPI).`] : [];

  let subject: string;
  let label: string;
  let heading: string;
  let bodyHtml: string;
  let textLines: string[];
  let cta: { url: string; label: string } | undefined = { url: orderUrl, label: "View your order" };
  let noteHtml: string | undefined;

  switch (event.kind) {
    case "SHIPPED":
      subject = `Your order has shipped: ${order.orderId} — ${BUSINESS.brand}`;
      label = "Order shipped";
      heading = `${firstName}, your order is on its way`;
      bodyHtml = `${idLine}<p style="margin:0;">Good news — your order has been handed over for delivery. It usually arrives within ${esc(POLICY.deliveryDays)}.</p>${itemsHtml}${trackingHtml}${codNote}`;
      textLines = [`${firstName}, your order ${order.orderId} is on its way.`, `It usually arrives within ${POLICY.deliveryDays}.`, ``, ...items.map((line) => `- ${line}`), ...trackingText, ...codText];
      break;
    case "TRACKING":
      subject = `Tracking details for your order ${order.orderId} — ${BUSINESS.brand}`;
      label = "Tracking update";
      heading = `${firstName}, here are your tracking details`;
      bodyHtml = `${idLine}<p style="margin:0;">You can follow your parcel with the details below.</p>${trackingHtml}`;
      textLines = [`${firstName}, here are the tracking details for order ${order.orderId}.`, ...trackingText];
      break;
    case "DELIVERED":
      subject = `Delivered: ${order.orderId} — ${BUSINESS.brand}`;
      label = "Order delivered";
      heading = `${firstName}, your order has been delivered`;
      bodyHtml = `${idLine}<p style="margin:0;">We hope you love your ceramics. If anything arrived damaged, tell us within ${POLICY.damageReportHours} hours and we'll arrange a free replacement.</p>${itemsHtml}`;
      noteHtml = `Enjoying your purchase? Leave a review on the product page — it helps other customers.`;
      textLines = [`${firstName}, your order ${order.orderId} has been delivered.`, `If anything arrived damaged, tell us within ${POLICY.damageReportHours} hours for a free replacement.`, ``, ...items.map((line) => `- ${line}`)];
      break;
    case "CANCELLED": {
      const paid = order.paymentMethod === "ONLINE" && order.paymentStatus === "PAID";
      const reason = order.cancelReason?.trim();
      subject = `Order cancelled: ${order.orderId} — ${BUSINESS.brand}`;
      label = "Order cancelled";
      heading = `${firstName}, your order was cancelled`;
      bodyHtml = `${idLine}<p style="margin:0;">Your order has been cancelled${reason ? `: ${esc(reason)}` : "."}</p>${itemsHtml}<p style="margin:14px 0 0;">${
        paid
          ? "You have already paid for this order, so a refund will be issued — we'll email you again as soon as it is sent."
          : "You haven't been charged anything for this order."
      }</p>`;
      textLines = [`${firstName}, your order ${order.orderId} was cancelled${reason ? `: ${reason}` : "."}`, ``, ...items.map((line) => `- ${line}`), ``, paid ? "You have already paid, so a refund will be issued — we'll email you again when it is sent." : "You haven't been charged anything for this order."];
      cta = undefined;
      break;
    }
    case "REFUNDED": {
      const amount = rupees(event.amount);
      const where =
        event.method === "razorpay"
          ? `to your original payment method. It usually shows up within ${POLICY.refundDays}, depending on your bank.`
          : "directly by us. Please contact us if you don't see it soon.";
      subject = `${event.full ? "Refund" : "Partial refund"} issued: ${order.orderId} — ${BUSINESS.brand}`;
      label = "Refund issued";
      heading = `${firstName}, your refund of ${amount} is on its way`;
      bodyHtml = `${idLine}<p style="margin:0;">We've issued a ${event.full ? "full" : "partial"} refund of <strong>${amount}</strong> ${where}</p>`;
      textLines = [`${firstName}, we've issued a ${event.full ? "full" : "partial"} refund of ${amount} for order ${order.orderId} ${where}`];
      break;
    }
  }

  const html = emailLayout({ title: subject, label, heading, body: bodyHtml, cta, note: noteHtml });
  const text = [...textLines, ...(cta ? [``, `View your order: ${orderUrl}`] : []), ``, `Questions? ${BUSINESS.email} · ${BUSINESS.phone}`].join("\n");
  return { subject, html, text };
}

/**
 * Emails the customer about an order update. Best effort: never throws, and a
 * failed email never affects the admin action that triggered it.
 */
export async function sendOrderStatusEmail(orderRowId: string, event: OrderStatusEmail) {
  try {
    const order = await loadOrder(orderRowId);
    if (!order?.shippingEmail) return false;
    return await sendEmail({ to: order.shippingEmail, ...buildOrderStatusEmail(order, event), replyTo: BUSINESS.email });
  } catch (error) {
    console.error(`[email] order status email (${event.kind}) failed for order ${orderRowId}:`, error);
    return false;
  }
}
