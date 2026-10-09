import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../auth";
import { CheckoutError, couponCodeSchema, quoteCheckout } from "../../../../lib/checkout-server";
import { isOnlinePaymentConfigured } from "../../../../lib/payments";
import { cartRequestListSchema } from "../../../../lib/cart-server";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";

const quoteSchema = z.object({
  couponCode: couponCodeSchema,
  // Guest checkout only: the browser's cart (ignored when signed in).
  items: cartRequestListSchema.shape.items.optional(),
});

// Server-computed order totals for the checkout summary (and coupon preview).
export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coupon code." }, { status: 400 });
  }

  // Only coupon lookups are limited, to stop codes being guessed by brute force.
  const limitKey = customerId ?? `guest:${clientIp(request.headers)}`;
  if (parsed.data.couponCode && !rateLimit(`coupon:${limitKey}`, 20, 10 * 60 * 1000).allowed) {
    return NextResponse.json(
      { error: "Too many coupon attempts. Please try again in a few minutes.", code: "COUPON" },
      { status: 429 }
    );
  }

  try {
    const buyer = customerId ? { customerId } : { guestItems: parsed.data.items ?? [] };
    const quote = await quoteCheckout(buyer, parsed.data.couponCode);
    return NextResponse.json({
      items: quote.items,
      subtotal: quote.subtotal,
      discount: quote.discount,
      delivery: quote.delivery,
      gst: quote.gst,
      total: quote.total,
      coupon: quote.coupon && { code: quote.coupon.code, description: quote.coupon.description },
      onlinePaymentAvailable: isOnlinePaymentConfigured(),
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
