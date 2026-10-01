import { NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "../../../auth";
import {
  CheckoutError,
  couponCodeSchema,
  placeOrder,
  shippingSchema,
} from "../../../lib/checkout-server";
import { rateLimit } from "../../../lib/rate-limit";
import { prisma } from "../../../lib/prisma";
import { sendOrderConfirmationEmails } from "../../../lib/order-emails";

const checkoutSchema = z.object({
  shipping: shippingSchema,
  couponCode: couponCodeSchema,
  expectedTotal: z.number().nonnegative(),
  saveAddress: z.boolean().optional().default(false),
  paymentMethod: z.enum(["ONLINE", "COD"]).optional().default("ONLINE"),
});

export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.id;
  if (!customerId) {
    return NextResponse.json({ error: "Please log in to place your order." }, { status: 401 });
  }

  if (!rateLimit(`checkout:${customerId}`, 10, 10 * 60 * 1000).allowed) {
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

  try {
    const order = await placeOrder({ customerId, ...parsed.data });

    // COD orders are confirmed straight away; email after the response is sent.
    if (parsed.data.paymentMethod === "COD") {
      after(async () => {
        const row = await prisma.order.findUnique({ where: { orderId: order.orderId }, select: { id: true } });
        if (row) await sendOrderConfirmationEmails(row.id);
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
