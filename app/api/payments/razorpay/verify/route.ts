import { NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../auth";
import { prisma } from "../../../../../lib/prisma";
import {
  PaymentError,
  markPaymentCaptured,
  verifyCheckoutSignature,
} from "../../../../../lib/payments";
import { sendOrderConfirmationEmails } from "../../../../../lib/order-emails";

const schema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

// Called by the browser with Razorpay Checkout's success response. The
// signature proves the payment came from Razorpay for the order we created.
export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.id;
  if (!customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
    select: { order: { select: { orderId: true, customerId: true } } },
  });
  if (!payment || payment.order.customerId !== customerId) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  try {
    if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const captured = await markPaymentCaptured({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (captured.found) after(() => sendOrderConfirmationEmails(captured.orderRowId).then(() => undefined));

  return NextResponse.json({ orderId: payment.order.orderId });
}
