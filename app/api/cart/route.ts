import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../auth";
import {
  CartError,
  MAX_LINE_QUANTITY,
  clearCustomerCart,
  getCustomerCart,
  removeCustomerCartItem,
  setCustomerCartItem,
} from "../../../lib/cart-server";

const addSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

const updateSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(0).max(MAX_LINE_QUANTITY),
});

async function requireCustomerId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function errorResponse(error: unknown) {
  if (error instanceof CartError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

async function respondWithCart(customerId: string, extraNotices: (string | null)[] = []) {
  const cart = await getCustomerCart(customerId);
  const notices = [...extraNotices.filter((n): n is string => !!n), ...cart.notices];
  return NextResponse.json({ items: cart.items, notices });
}

export async function GET() {
  const customerId = await requireCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return respondWithCart(customerId);
}

// Add to cart (increments an existing line).
export async function POST(request: Request) {
  const customerId = await requireCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = addSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
  }

  try {
    const notice = await setCustomerCartItem(customerId, parsed.data.slug, parsed.data.quantity, "add");
    return respondWithCart(customerId, [notice]);
  } catch (error) {
    return errorResponse(error);
  }
}

// Set a line's quantity (0 removes it).
export async function PATCH(request: Request) {
  const customerId = await requireCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
  }

  try {
    const notice = await setCustomerCartItem(customerId, parsed.data.slug, parsed.data.quantity, "set");
    return respondWithCart(customerId, [notice]);
  } catch (error) {
    return errorResponse(error);
  }
}

// Remove one line (?slug=...) or clear the whole cart (no slug).
export async function DELETE(request: Request) {
  const customerId = await requireCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = new URL(request.url).searchParams.get("slug");
  if (slug) {
    await removeCustomerCartItem(customerId, slug);
  } else {
    await clearCustomerCart(customerId);
  }

  return respondWithCart(customerId);
}
