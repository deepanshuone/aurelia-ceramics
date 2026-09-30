import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import {
  cartRequestListSchema,
  getCustomerCart,
  mergeGuestCart,
} from "../../../../lib/cart-server";

// Folds the browser's guest cart into the logged-in customer's saved cart.
export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.id;
  if (!customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = cartRequestListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }

  const mergeNotices = await mergeGuestCart(customerId, parsed.data.items);
  const cart = await getCustomerCart(customerId);

  return NextResponse.json({ items: cart.items, notices: [...mergeNotices, ...cart.notices] });
}
