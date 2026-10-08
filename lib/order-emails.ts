import { BUSINESS, POLICY } from "./business";
import { getStoreProcessingDays } from "./store-settings";
import { sendEmail } from "./email";
import { prisma } from "./prisma";
import { orderPageUrl } from "./order-access";
import { getSiteUrl } from "./site";

// Email-safe HTML: every customer-entered value goes through this.
const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// ₹1,895 for whole rupees, ₹1,804.50 (never ₹1,804.5) when there are paise.
const rupees = (value: { toString(): string } | number) => {
  const amount = Number(value);
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
};

type OrderForEmail = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

function loadOrder(orderRowId: string) {
  return prisma.order.findUnique({
    where: { id: orderRowId },
    include: {
      coupon: { select: { code: true } },
      items: { orderBy: { createdAt: "asc" }, select: { name: true, price: true, quantity: true } },
    },
  });
}

function paymentLine(order: OrderForEmail) {
  if (order.paymentMethod === "COD") {
    return { label: "Cash on Delivery", note: `Please keep ${rupees(order.total)} ready (cash or UPI) when your order arrives.` };
  }
  return { label: "Paid online", note: "Your payment has been received. Thank you!" };
}

/**
 * Customer-facing order confirmation. `processingDays` is the order's
 * processing time (its own, else the store's); without it the email falls
 * back to the general dispatch promise.
 */
export function buildConfirmationEmail(order: OrderForEmail, processingDays?: number) {
  const firstName = (order.shippingName ?? "").trim().split(/\s+/)[0] || "there";
  const orderUrl = orderPageUrl(order);
  const payment = paymentLine(order);
  const discount = Number(order.discount);
  const delivery = Number(order.delivery);
  const placed = order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee5d8;font-size:14px;color:#171614;">
            ${esc(item.name)}<br><span style="color:#746f67;font-size:12px;">${rupees(item.price)} × ${item.quantity}</span>
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #eee5d8;font-size:14px;color:#171614;white-space:nowrap;">
            ${rupees(Number(item.price) * item.quantity)}
          </td>
        </tr>`
    )
    .join("");

  const totalRow = (label: string, value: string, bold = false) => `
    <tr>
      <td style="padding:4px 0;font-size:${bold ? 16 : 14}px;color:${bold ? "#171614" : "#746f67"};${bold ? "font-weight:700;" : ""}">${label}</td>
      <td align="right" style="padding:4px 0;font-size:${bold ? 16 : 14}px;color:#171614;${bold ? "font-weight:700;" : ""}">${value}</td>
    </tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order confirmed</title></head>
<body style="margin:0;padding:0;background:#f5f1e9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">Your order ${esc(order.orderId)} is confirmed — total ${rupees(order.total)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e7e1d6;">
        <tr><td style="background:#171614;padding:22px 28px;color:#f5f1e9;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:3px;">
          ${esc(BUSINESS.brand.toUpperCase())}
        </td></tr>

        <tr><td style="padding:30px 28px 10px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;color:#6b5947;">ORDER CONFIRMED</p>
          <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;color:#171614;">Thank you, ${esc(firstName)}!</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#46423c;">
            We've received your order and it's being prepared with care. We'll email you again when it ships.
          </p>
        </td></tr>

        <tr><td style="padding:18px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;">
            <tr>
              <td style="padding:14px 16px;font-size:13px;color:#746f67;">Order ID<br><strong style="color:#171614;font-size:15px;">${esc(order.orderId)}</strong></td>
              <td style="padding:14px 16px;font-size:13px;color:#746f67;">Placed on<br><strong style="color:#171614;font-size:15px;">${placed}</strong></td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:22px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
            ${totalRow("Subtotal", rupees(order.subtotal))}
            ${discount > 0 ? totalRow(`Discount${order.coupon ? ` (${esc(order.coupon.code)})` : ""}`, `−${rupees(discount)}`) : ""}
            ${totalRow("Delivery", delivery === 0 ? "FREE" : rupees(delivery))}
            ${totalRow("Total", rupees(order.total), true)}
          </table>
        </td></tr>

        <tr><td style="padding:22px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e1d6;">
            <tr><td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#46423c;">
              <strong style="color:#171614;">Payment:</strong> ${payment.label}<br>${payment.note}
            </td></tr>
            <tr><td style="padding:14px 16px;border-top:1px solid #e7e1d6;font-size:14px;line-height:1.6;color:#46423c;">
              <strong style="color:#171614;">Delivering to:</strong><br>
              ${esc(order.shippingName)}<br>${esc(order.shippingAddress)}<br>${esc(order.shippingCity)}, ${esc(order.shippingState)} – ${esc(order.shippingPin)}<br>${esc(order.shippingPhone)}
            </td></tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding:26px 28px 6px;">
          <a href="${orderUrl}" style="display:inline-block;background:#171614;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:14px;font-weight:bold;">View your order</a>
        </td></tr>

        <tr><td style="padding:14px 28px 26px;font-size:13px;line-height:1.6;color:#746f67;text-align:center;">
          ${
            processingDays === undefined
              ? `Orders are dispatched within ${POLICY.dispatchDays}.`
              : processingDays === 0
                ? "Your order will be dispatched shortly."
                : `Your order will be ready to ship within ${processingDays} day${processingDays === 1 ? "" : "s"}.`
          } Ceramics are packed with care — if anything arrives damaged,
          tell us within ${POLICY.damageReportHours} hours for a free replacement.
        </td></tr>

        <tr><td style="background:#f5f1e9;padding:18px 28px;font-size:12px;line-height:1.6;color:#746f67;text-align:center;">
          Questions? Reply to this email or write to <a href="mailto:${esc(BUSINESS.email)}" style="color:#6b5947;">${esc(BUSINESS.email)}</a>
          · ${esc(BUSINESS.phone)}<br>${esc(BUSINESS.legalName)}, ${esc(BUSINESS.address)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `Thank you, ${firstName}! Your order is confirmed.`,
    ``,
    `Order ID: ${order.orderId}`,
    `Placed on: ${placed}`,
    ``,
    ...order.items.map((item) => `- ${item.name} — ${rupees(item.price)} × ${item.quantity} = ${rupees(Number(item.price) * item.quantity)}`),
    ``,
    `Subtotal: ${rupees(order.subtotal)}`,
    ...(discount > 0 ? [`Discount${order.coupon ? ` (${order.coupon.code})` : ""}: -${rupees(discount)}`] : []),
    `Delivery: ${delivery === 0 ? "FREE" : rupees(delivery)}`,
    `Total: ${rupees(order.total)}`,
    ``,
    `Payment: ${payment.label}. ${payment.note}`,
    ``,
    `Delivering to:`,
    `${order.shippingName}`,
    `${order.shippingAddress}`,
    `${order.shippingCity}, ${order.shippingState} - ${order.shippingPin}`,
    `${order.shippingPhone}`,
    ``,
    `View your order: ${orderUrl}`,
    ``,
    `Questions? ${BUSINESS.email} · ${BUSINESS.phone}`,
  ].join("\n");

  return { subject: `Order confirmed: ${order.orderId} — ${BUSINESS.brand}`, html, text };
}

/** Short alert for the shop owner. */
function buildOwnerAlert(order: OrderForEmail) {
  const adminUrl = `${getSiteUrl()}/admin/orders/${encodeURIComponent(order.orderId)}`;
  const method = order.paymentMethod === "COD" ? "Cash on Delivery" : "Paid online";
  const lines = order.items.map((item) => `${item.quantity} × ${item.name}`);
  const text = [
    `New order ${order.orderId} — ${rupees(order.total)} (${method})`,
    ``,
    ...lines,
    ``,
    `Customer: ${order.shippingName}, ${order.shippingPhone}, ${order.shippingEmail}`,
    `Ship to: ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingState} - ${order.shippingPin}`,
    ``,
    `Open in admin: ${adminUrl}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#171614;">
    <h2 style="margin:0 0 8px;">New order ${esc(order.orderId)} — ${rupees(order.total)}</h2>
    <p style="margin:0 0 10px;color:#6b5947;"><strong>${method}</strong></p>
    <ul>${lines.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
    <p>Customer: ${esc(order.shippingName)}, ${esc(order.shippingPhone)}, ${esc(order.shippingEmail)}<br>
    Ship to: ${esc(order.shippingAddress)}, ${esc(order.shippingCity)}, ${esc(order.shippingState)} – ${esc(order.shippingPin)}</p>
    <p><a href="${adminUrl}">Open in admin →</a></p></div>`;
  return { subject: `New order ${order.orderId} — ${rupees(order.total)} (${method})`, html, text };
}

/**
 * Sends the confirmation email (and the owner alert) exactly once per order,
 * as soon as it is confirmed — COD at checkout, online orders after payment.
 * Safe to call from several places (checkout, payment verify, webhook).
 */
export async function sendOrderConfirmationEmails(orderRowId: string) {
  // Claim the send atomically so concurrent callers can't double-send.
  const claimed = await prisma.order.updateMany({
    where: {
      id: orderRowId,
      confirmationEmailSentAt: null,
      status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] },
    },
    data: { confirmationEmailSentAt: new Date() },
  });
  if (claimed.count === 0) return false;

  const order = await loadOrder(orderRowId);
  if (!order || !order.shippingEmail) return false;

  const confirmation = buildConfirmationEmail(order, order.processingDays ?? (await getStoreProcessingDays()));
  const sent = await sendEmail({ to: order.shippingEmail, ...confirmation, replyTo: BUSINESS.email });

  if (!sent) {
    // Release the claim so a later trigger (e.g. the payment webhook) can retry.
    await prisma.order.update({ where: { id: orderRowId }, data: { confirmationEmailSentAt: null } });
  }

  const ownerAddress = process.env.ORDER_ALERT_EMAIL || BUSINESS.email;
  if (ownerAddress) await sendEmail({ to: ownerAddress, ...buildOwnerAlert(order), replyTo: order.shippingEmail });

  return sent;
}
