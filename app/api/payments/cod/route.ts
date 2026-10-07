import { revalidatePath } from "next/cache";
import { NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "../../../../auth";
import { PaymentError, switchToCashOnDelivery } from "../../../../lib/payments";
import { sendOrderConfirmationEmails } from "../../../../lib/order-emails";

const schema = z.object({ orderId: z.string().trim().min(1).max(40) });

// Lets a customer whose online payment failed take the same order as Cash on
// Delivery instead. Only works on the signed-in customer's own unpaid orders.
export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.id;
  if (!customerId) {
    return NextResponse.json({ error: "Please log in to update your order." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  }

  try {
    const orderRowId = await switchToCashOnDelivery(customerId, parsed.data.orderId);
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
