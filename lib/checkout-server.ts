import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "./prisma";
import { getCustomerCart } from "./cart-server";
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, type CartLine } from "./cart";
import { expireStaleOrders, isOnlinePaymentConfigured } from "./payments";

export const shippingSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(100),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, "").replace(/^(\+91|0)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number.")),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200),
  address: z.string().trim().min(5, "Please enter your delivery address.").max(500),
  city: z.string().trim().min(2, "Please enter your city.").max(100),
  state: z.string().trim().min(2, "Please select your state.").max(100),
  pin: z.string().trim().regex(/^\d{6}$/, "Please enter a valid 6-digit PIN code."),
});

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .max(40)
  .optional()
  .transform((value) => value || undefined);

export class CheckoutError extends Error {
  constructor(
    message: string,
    public status: number,
    public code:
      | "EMPTY_CART"
      | "CART_CHANGED"
      | "OUT_OF_STOCK"
      | "COUPON"
      | "PRICE_CHANGED"
      | "ACCOUNT_BLOCKED"
      | "PAYMENT_UNAVAILABLE"
  ) {
    super(message);
  }
}

// All money maths is done in integer paise to avoid floating-point drift.
const toPaise = (rupees: number) => Math.round(rupees * 100);
const toRupees = (paise: number) => paise / 100;

export type Quote = {
  items: CartLine[];
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  coupon: { id: string; code: string; description: string | null } | null;
};

async function resolveCoupon(code: string, subtotalPaise: number) {
  const coupon = await prisma.coupon.findUnique({ where: { code } });

  if (!coupon || !coupon.isActive) {
    throw new CheckoutError("This coupon code is not valid.", 400, "COUPON");
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new CheckoutError("This coupon has expired.", 400, "COUPON");
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new CheckoutError("This coupon has reached its usage limit.", 400, "COUPON");
  }

  const minOrder = coupon.minOrderValue ? toPaise(Number(coupon.minOrderValue)) : 0;
  if (subtotalPaise < minOrder) {
    throw new CheckoutError(
      `This coupon needs a minimum order of ₹${toRupees(minOrder).toLocaleString("en-IN")}.`,
      400,
      "COUPON"
    );
  }

  let discount =
    coupon.discountType === "PERCENTAGE"
      ? Math.round((subtotalPaise * Number(coupon.discountValue)) / 100)
      : toPaise(Number(coupon.discountValue));

  if (coupon.maxDiscount) discount = Math.min(discount, toPaise(Number(coupon.maxDiscount)));
  discount = Math.min(discount, subtotalPaise);

  return { coupon, discount };
}

/**
 * Prices the customer's saved cart entirely from the database. Throws if the
 * cart is empty, contains unavailable items, or had to be adjusted for stock —
 * the customer must review those changes before paying.
 */
export async function quoteCheckout(customerId: string, couponCode?: string): Promise<Quote> {
  const cart = await getCustomerCart(customerId);

  if (cart.items.length === 0) {
    throw new CheckoutError("Your cart is empty.", 400, "EMPTY_CART");
  }
  if (cart.notices.length > 0) {
    throw new CheckoutError(cart.notices.join(" "), 409, "CART_CHANGED");
  }
  const unavailable = cart.items.find((item) => !item.available);
  if (unavailable) {
    throw new CheckoutError(`${unavailable.name} is out of stock.`, 409, "OUT_OF_STOCK");
  }

  const subtotal = cart.items.reduce((sum, item) => sum + toPaise(item.price) * item.quantity, 0);
  const applied = couponCode ? await resolveCoupon(couponCode, subtotal) : null;
  const discount = applied?.discount ?? 0;

  // Free delivery is judged on the merchandise value, before any coupon.
  const delivery = subtotal >= toPaise(FREE_DELIVERY_THRESHOLD) ? 0 : toPaise(DELIVERY_FEE);

  return {
    items: cart.items,
    subtotal: toRupees(subtotal),
    discount: toRupees(discount),
    delivery: toRupees(delivery),
    total: toRupees(subtotal - discount + delivery),
    coupon: applied
      ? { id: applied.coupon.id, code: applied.coupon.code, description: applied.coupon.description }
      : null,
  };
}

// e.g. AC-260930-7KQ2MX. Crockford-style alphabet (no I/L/O/U) keeps it readable over the phone.
function generateOrderId() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = randomBytes(6);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `AC-${date}-${suffix}`;
}

export async function placeOrder(input: {
  customerId: string;
  shipping: z.infer<typeof shippingSchema>;
  couponCode?: string;
  expectedTotal: number;
  saveAddress: boolean;
  paymentMethod: "ONLINE" | "COD";
}) {
  // Don't create an order that could never be paid for.
  if (input.paymentMethod === "ONLINE" && !isOnlinePaymentConfigured()) {
    throw new CheckoutError(
      "Online payment isn't available right now. Please choose Cash on Delivery.",
      400,
      "PAYMENT_UNAVAILABLE"
    );
  }

  // Login tokens outlive an admin blocking the account, so check it here.
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { isActive: true },
  });
  if (!customer?.isActive) {
    throw new CheckoutError("Your account can't place orders. Please contact us.", 403, "ACCOUNT_BLOCKED");
  }

  // Release stock held by abandoned unpaid orders before checking availability.
  await expireStaleOrders();

  const quote = await quoteCheckout(input.customerId, input.couponCode);

  if (toPaise(quote.total) !== toPaise(input.expectedTotal)) {
    throw new CheckoutError(
      "Prices in your cart have changed. Please review your order total before placing it.",
      409,
      "PRICE_CHANGED"
    );
  }

  const { shipping } = input;

  return prisma.$transaction(
    async (tx) => {
      // Conditional decrements: if another order took the stock first, the
      // update matches zero rows and the whole transaction rolls back.
      for (const item of quote.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new CheckoutError(
            `${item.name} just went out of stock. Please review your cart.`,
            409,
            "OUT_OF_STOCK"
          );
        }
      }

      if (quote.coupon) {
        const claimed = await tx.coupon.updateMany({
          where: {
            id: quote.coupon.id,
            isActive: true,
            OR: [{ usageLimit: null }, { usedCount: { lt: prisma.coupon.fields.usageLimit } }],
          },
          data: { usedCount: { increment: 1 } },
        });
        if (claimed.count === 0) {
          throw new CheckoutError("This coupon has reached its usage limit.", 409, "COUPON");
        }
      }

      const order = await tx.order.create({
        data: {
          orderId: generateOrderId(),
          customerId: input.customerId,
          paymentMethod: input.paymentMethod,
          // COD orders are confirmed straight away; online orders wait for payment.
          status: input.paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
          subtotal: quote.subtotal,
          discount: quote.discount,
          delivery: quote.delivery,
          total: quote.total,
          couponId: quote.coupon?.id,
          shippingName: shipping.name,
          shippingPhone: shipping.phone,
          shippingEmail: shipping.email,
          shippingAddress: shipping.address,
          shippingCity: shipping.city,
          shippingState: shipping.state,
          shippingPin: shipping.pin,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        select: { orderId: true, total: true },
      });

      await tx.cartItem.deleteMany({ where: { cart: { customerId: input.customerId } } });

      if (input.saveAddress) {
        const existing = await tx.address.findFirst({
          where: {
            customerId: input.customerId,
            address: shipping.address,
            city: shipping.city,
            state: shipping.state,
            pin: shipping.pin,
          },
          select: { id: true },
        });
        if (!existing) {
          const count = await tx.address.count({ where: { customerId: input.customerId } });
          await tx.address.create({
            data: {
              customerId: input.customerId,
              address: shipping.address,
              city: shipping.city,
              state: shipping.state,
              pin: shipping.pin,
              isDefault: count === 0,
            },
          });
        }
      }

      return { orderId: order.orderId, total: Number(order.total) };
    },
    { timeout: 20000 }
  );
}
