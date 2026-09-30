import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../auth";
import { PaymentError, startPayment } from "../../../../../lib/payments";

const schema = z.object({ orderId: z.string().trim().min(1).max(40) });

// Returns the Razorpay Checkout parameters for one of the customer's orders.
export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.id;
  if (!customerId) {
    return NextResponse.json({ error: "Please log in to pay for your order." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  }

  try {
    return NextResponse.json(await startPayment(customerId, parsed.data.orderId));
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
