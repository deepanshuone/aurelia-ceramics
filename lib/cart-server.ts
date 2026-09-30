import { z } from "zod";
import { prisma } from "./prisma";
import type { CartLine, CartResponse } from "./cart";

// Hard ceiling per line, independent of stock, to stop absurd quantities.
export const MAX_LINE_QUANTITY = 99;

export const cartRequestItemSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(0).max(MAX_LINE_QUANTITY),
});

export const cartRequestListSchema = z.object({
  items: z.array(cartRequestItemSchema).max(100),
});

export type CartRequestItem = z.infer<typeof cartRequestItemSchema>;

const productSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  mrp: true,
  stock: true,
  isActive: true,
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
};

type SelectedProduct = {
  id: string;
  slug: string;
  name: string;
  price: { toString(): string };
  mrp: { toString(): string } | null;
  stock: number;
  isActive: boolean;
  images: { url: string }[];
};

function maxAllowed(stock: number) {
  return Math.max(0, Math.min(stock, MAX_LINE_QUANTITY));
}

function toLine(product: SelectedProduct, quantity: number): CartLine {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    price: Number(product.price),
    mrp: product.mrp ? Number(product.mrp) : null,
    image: product.images[0]?.url ?? "/placeholder-product.svg",
    stock: product.stock,
    quantity,
    available: product.stock > 0,
  };
}

// Collapses duplicate slugs by summing their quantities.
function normalizeRequests(items: CartRequestItem[]) {
  const merged = new Map<string, number>();
  for (const item of items) {
    if (item.quantity <= 0) continue;
    merged.set(item.slug, (merged.get(item.slug) ?? 0) + item.quantity);
  }
  return merged;
}

/**
 * Resolves a guest cart (slug + quantity pairs from the browser) against live
 * product data. Prices, names and stock always come from the database; the
 * browser only ever supplies which products and how many.
 */
export async function resolveGuestCart(items: CartRequestItem[]): Promise<CartResponse> {
  const requested = normalizeRequests(items);
  const notices: string[] = [];

  if (requested.size === 0) return { items: [], notices };

  const products = await prisma.product.findMany({
    where: { slug: { in: [...requested.keys()] } },
    select: productSelect,
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const lines: CartLine[] = [];
  for (const [slug, quantity] of requested) {
    const product = bySlug.get(slug);
    if (!product || !product.isActive) {
      notices.push("An item in your cart is no longer available and was removed.");
      continue;
    }

    const limit = maxAllowed(product.stock);
    let finalQuantity = quantity;
    if (limit === 0) {
      notices.push(`${product.name} is currently out of stock.`);
    } else if (quantity > limit) {
      finalQuantity = limit;
      notices.push(`Only ${limit} of ${product.name} available — quantity updated.`);
    }

    lines.push(toLine(product, finalQuantity));
  }

  return { items: lines, notices };
}

async function getOrCreateCartId(customerId: string) {
  const cart = await prisma.cart.upsert({
    where: { customerId },
    update: {},
    create: { customerId },
    select: { id: true },
  });
  return cart.id;
}

/**
 * Loads a logged-in customer's cart, removing lines for products that were
 * deactivated and clamping quantities that now exceed stock.
 */
export async function getCustomerCart(customerId: string): Promise<CartResponse> {
  const cartId = await getOrCreateCartId(customerId);
  const notices: string[] = [];

  const rows = await prisma.cartItem.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    include: { product: { select: productSelect } },
  });

  const lines: CartLine[] = [];
  for (const row of rows) {
    const { product } = row;

    if (!product.isActive) {
      await prisma.cartItem.delete({ where: { id: row.id } });
      notices.push(`${product.name} is no longer available and was removed.`);
      continue;
    }

    const limit = maxAllowed(product.stock);
    let quantity = row.quantity;
    if (limit === 0) {
      notices.push(`${product.name} is currently out of stock.`);
    } else if (quantity > limit) {
      quantity = limit;
      await prisma.cartItem.update({ where: { id: row.id }, data: { quantity } });
      notices.push(`Only ${limit} of ${product.name} available — quantity updated.`);
    }

    lines.push(toLine(product, quantity));
  }

  return { items: lines, notices };
}

export class CartError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function findActiveProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, name: true, stock: true, isActive: true },
  });
  if (!product || !product.isActive) {
    throw new CartError("This product is no longer available.", 404);
  }
  return product;
}

// variantId is always null for now; Postgres treats NULLs as distinct in the
// composite unique index, so we look the line up rather than relying on upsert.
async function findLine(cartId: string, productId: string) {
  return prisma.cartItem.findFirst({
    where: { cartId, productId, variantId: null },
    select: { id: true, quantity: true },
  });
}

/**
 * Sets a line's quantity, or adds to it when `mode` is "add". Returns a notice
 * when the requested quantity had to be reduced to fit stock.
 */
export async function setCustomerCartItem(
  customerId: string,
  slug: string,
  quantity: number,
  mode: "add" | "set"
): Promise<string | null> {
  const product = await findActiveProduct(slug);
  const cartId = await getOrCreateCartId(customerId);
  const existing = await findLine(cartId, product.id);

  const target = mode === "add" ? (existing?.quantity ?? 0) + quantity : quantity;

  if (target <= 0) {
    if (existing) await prisma.cartItem.delete({ where: { id: existing.id } });
    return null;
  }

  const limit = maxAllowed(product.stock);
  if (limit === 0) {
    throw new CartError(`${product.name} is out of stock.`, 409);
  }

  const finalQuantity = Math.min(target, limit);
  const notice =
    finalQuantity < target ? `Only ${limit} of ${product.name} available — quantity updated.` : null;

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: finalQuantity } });
  } else {
    await prisma.cartItem.create({ data: { cartId, productId: product.id, quantity: finalQuantity } });
  }

  return notice;
}

export async function removeCustomerCartItem(customerId: string, slug: string) {
  const cartId = await getOrCreateCartId(customerId);
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return;
  await prisma.cartItem.deleteMany({ where: { cartId, productId: product.id } });
}

export async function clearCustomerCart(customerId: string) {
  const cartId = await getOrCreateCartId(customerId);
  await prisma.cartItem.deleteMany({ where: { cartId } });
}

/**
 * Folds a guest cart into the customer's saved cart after login. Quantities
 * for products present in both are summed, then clamped to stock.
 */
export async function mergeGuestCart(customerId: string, items: CartRequestItem[]) {
  const notices: string[] = [];
  for (const [slug, quantity] of normalizeRequests(items)) {
    try {
      const notice = await setCustomerCartItem(customerId, slug, quantity, "add");
      if (notice) notices.push(notice);
    } catch (error) {
      if (error instanceof CartError) notices.push(error.message);
      else throw error;
    }
  }
  return notices;
}
