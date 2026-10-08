import { revalidatePath } from "next/cache";
import { NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "../../../auth";
import {
  CheckoutError,
  couponCodeSchema,
  placeOrder,
  shippingSchema,
} from "../../../lib/checkout-server";
import { cartRequestListSchema } from "../../../lib/cart-server";
import { orderAccessToken } from "../../../lib/order-access";
import { clientIp, rateLimit } from "../../../lib/rate-limit";
import { prisma } from "../../../lib/prisma";
import { sendOrderConfirmationEmails } from "../../../lib/order-emails";

const checkoutSchema = z.object({
  shipping: shippingSchema,
  couponCode: couponCodeSchema,
  expectedTotal: z.number().nonnegative(),
  saveAddress: z.boolean().optional().default(false),
  paymentMethod: z.enum(["ONLINE", "COD"]).optional().default("ONLINE"),
  // Guest checkout only (ignored when signed in): the browser's cart and a
  // random key for this checkout so retries can't create a second order.
  items: cartRequestListSchema.shape.items.optional(),
  checkoutKey: z.string().regex(/^[A-Za-z0-9-]{16,64}$/).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.id;

  const limitKey = customerId ? `checkout:${customerId}` : `checkout:guest:${clientIp(request.headers)}`;
  if (!rateLimit(limitKey, 10, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many orders in a short time. Please wait a few minutes." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check your details." },
      { status: 400 }
    );
  }

  const { items, checkoutKey, ...details } = parsed.data;
  if (!customerId && (!items || !checkoutKey)) {
    return NextResponse.json({ error: "Please refresh the page and try again." }, { status: 400 });
  }

  try {
    const { slugs, guest, ...order } = await placeOrder({
      ...details,
      buyer: customerId ? { customerId } : { guestItems: items! },
      checkoutKey: customerId ? undefined : checkoutKey,
    });

    // Stock just changed: refresh the cached product pages so they don't keep
    // showing "in stock" for items that were just bought.
    for (const slug of slugs) revalidatePath(`/products/${slug}`);

    // COD orders are confirmed straight away; email after the response is sent.
    if (parsed.data.paymentMethod === "COD") {
      after(async () => {
        const row = await prisma.order.findUnique({ where: { orderId: order.orderId }, select: { id: true } });
        if (row) await sendOrderConfirmationEmails(row.id);
      });
    }

    // Guests have no account, so this signed link is how they get back to the order.
    return NextResponse.json(guest ? { ...order, accessToken: orderAccessToken(order.orderId) } : order, {
      status: 201,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
