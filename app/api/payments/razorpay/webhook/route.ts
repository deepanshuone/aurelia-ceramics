import { NextResponse, after } from "next/server";
import {
  PaymentError,
  markPaymentCaptured,
  markPaymentFailed,
  verifyWebhookSignature,
} from "../../../../../lib/payments";
import { sendOrderConfirmationEmails } from "../../../../../lib/order-emails";

type PaymentEntity = {
  id: string;
  order_id: string;
  amount: number;
  error_description?: string | null;
};

type WebhookEvent = {
  event: string;
  payload?: { payment?: { entity?: PaymentEntity } };
};

// Server-to-server confirmation from Razorpay. This is what guarantees an
// order gets marked paid even if the customer closes the browser mid-payment.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  try {
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) {
    // Events we don't act on still get a 200 so Razorpay stops retrying.
    return NextResponse.json({ received: true });
  }

  switch (event.event) {
    case "payment.captured":
    case "order.paid":
      {
        const captured = await markPaymentCaptured({
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
          amountPaise: payment.amount,
          rawWebhookPayload: event,
        });
        if (captured.found) after(() => sendOrderConfirmationEmails(captured.orderRowId).then(() => undefined));
      }
      break;
    case "payment.failed":
      await markPaymentFailed({
        razorpayOrderId: payment.order_id,
        reason: payment.error_description ?? "Payment failed",
        rawWebhookPayload: event,
      });
      break;
  }

  return NextResponse.json({ received: true });
}
