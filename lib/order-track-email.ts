import { BUSINESS } from "./business";
import { emailLayout, escapeHtml as esc } from "./email-layout";
import { sendEmail } from "./email";
import { orderPageUrl } from "./order-access";

/** Emails the order's own address a link that opens it (Track Order page). */
export async function sendOrderLinkEmail(order: {
  orderId: string;
  customerId: string | null;
  shippingName: string | null;
  shippingEmail: string;
}) {
  const url = orderPageUrl(order);
  const firstName = (order.shippingName ?? "").trim().split(/\s+/)[0] || "there";
  const subject = `Track your order ${order.orderId} — ${BUSINESS.brand}`;

  const html = emailLayout({
    title: subject,
    label: "Track your order",
    heading: `Hi ${firstName}, here's your order`,
    body: `<p style="margin:0;">Someone asked to track order <strong>${esc(order.orderId)}</strong>. Use the button below to see its status, delivery date and tracking details.</p>`,
    cta: { url, label: "View your order" },
    note: "Didn't ask for this? You can ignore this email; the link only opens this one order.",
  });
  const text = [
    `Hi ${firstName},`,
    ``,
    `Here's the link to order ${order.orderId}: ${url}`,
    ``,
    `Didn't ask for this? You can ignore this email.`,
    ``,
    `Questions? ${BUSINESS.email} · ${BUSINESS.phone}`,
  ].join("\n");

  return sendEmail({ to: order.shippingEmail, subject, html, text, replyTo: BUSINESS.email });
}
