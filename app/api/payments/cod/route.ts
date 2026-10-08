import { revalidatePath } from "next/cache";
import { NextResponse, after } from "next/server";
import { z } from "zod";
import { orderAccessWhere } from "../../../../lib/order-access";
import { PaymentError, switchToCashOnDelivery } from "../../../../lib/payments";
import { sendOrderConfirmationEmails } from "../../../../lib/order-emails";

const schema = z.object({
  orderId: z.string().trim().min(1).max(40),
  // Guest orders: the signed link's token.
  token: z.string().max(100).optional(),
});

// Lets a customer whose online payment failed take the same order as Cash on
// Delivery instead. Only works on unpaid orders the visitor may access (their
// own when signed in, or a guest order through its signed link).
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  }

  const access = await orderAccessWhere(parsed.data.orderId, parsed.data.token);
  if (!access) {
    return NextResponse.json({ error: "Please log in to update your order." }, { status: 401 });
  }

  try {
    const orderRowId = await switchToCashOnDelivery(access);
    after(() => sendOrderConfirmationEmails(orderRowId).then(() => undefined));
    revalidatePath("/account/orders");
    return NextResponse.json({ orderId: parsed.data.orderId });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
