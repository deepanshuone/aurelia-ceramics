import { NextResponse } from "next/server";
import { cartRequestListSchema, resolveGuestCart } from "../../../../lib/cart-server";

// Public: resolves a guest cart (slug + quantity) to live prices and stock.
export async function POST(request: Request) {
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

  return NextResponse.json(await resolveGuestCart(parsed.data.items));
}
