import { NextResponse, after } from "next/server";
import { z } from "zod";
import { orderAccessWhere } from "../../../../../lib/order-access";
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
  // Guest orders: the signed link's token.
  token: z.string().max(100).optional(),
});

// Called by the browser with Razorpay Checkout's success response. The
// signature proves the payment came from Razorpay for the order we created.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
    select: { order: { select: { orderId: true, customerId: true } } },
  });
  const access = payment && (await orderAccessWhere(payment.order.orderId, parsed.data.token));
  if (!payment || !access || (access.customerId && payment.order.customerId !== access.customerId)) {
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
