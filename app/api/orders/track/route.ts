import { NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "../../../../auth";
import { isEmailConfigured } from "../../../../lib/email";
import { sendOrderLinkEmail } from "../../../../lib/order-track-email";
import { orderDetailPath } from "../../../../lib/order-links";
import { prisma } from "../../../../lib/prisma";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";

const schema = z.object({
  orderId: z.string().trim().toUpperCase().min(1).max(40),
  // The email address or mobile number the order was placed with.
  contact: z.string().trim().min(5).max(200),
});

const SENT_MESSAGE =
  "If those details match an order, we've emailed a link to open it to the address used for that order. Please check your inbox.";

const normalisePhone = (value: string) => value.replace(/[\s-]/g, "").replace(/^(\+91|0)/, "");

// Track Order: the order ID plus the order's email or phone gets a link to
// the order emailed to the order's own address. Nothing about the order is
// shown here, so a guessed ID and a guessed contact reveal nothing.
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!rateLimit(`track:ip:${ip}`, 10, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter your order ID and the email or phone you ordered with." }, { status: 400 });
  }
  const { orderId, contact } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { orderId },
    select: { orderId: true, customerId: true, shippingName: true, shippingEmail: true, shippingPhone: true },
  });

  // Signed in and it's their order: just open it.
  const session = await auth();
  if (order && session?.user?.id && order.customerId === session.user.id) {
    return NextResponse.json({ href: orderDetailPath(order.orderId) });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "We can't send order links right now. Please contact us with your order ID and we'll help." },
      { status: 503 }
    );
  }

  const matches =
    order?.shippingEmail &&
    (contact.toLowerCase() === order.shippingEmail.toLowerCase() ||
      (order.shippingPhone && normalisePhone(contact) === order.shippingPhone));

  // One email per order per hour at most, however many times it's asked for.
  if (matches && rateLimit(`track:order:${order.orderId}`, 1, 60 * 60 * 1000).allowed) {
    const email = { ...order, shippingEmail: order.shippingEmail! };
    after(() => sendOrderLinkEmail(email).then(() => undefined));
  }

  return NextResponse.json({ message: SENT_MESSAGE });
}
