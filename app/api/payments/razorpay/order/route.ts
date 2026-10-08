import { NextResponse } from "next/server";
import { z } from "zod";
import { orderAccessWhere } from "../../../../../lib/order-access";
import { PaymentError, startPayment } from "../../../../../lib/payments";

const schema = z.object({
  orderId: z.string().trim().min(1).max(40),
  // Guest orders: the signed link's token.
  token: z.string().max(100).optional(),
});

// Returns the Razorpay Checkout parameters for an order the visitor may access.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  }

  const access = await orderAccessWhere(parsed.data.orderId, parsed.data.token);
  if (!access) {
    return NextResponse.json({ error: "Please log in to pay for your order." }, { status: 401 });
  }

  try {
    return NextResponse.json(await startPayment(access));
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to start Razorpay payment", error);
    return NextResponse.json(
      { error: "Could not connect to the payment gateway. Please try again." },
      { status: 502 }
    );
  }
}
