import type { Prisma } from "./generated/prisma/client";

/**
 * Returns an order's reserved stock and coupon usage. Call inside the same
 * transaction that moves the order to CANCELLED, after a conditional update
 * has confirmed this caller is the one cancelling it (so it runs exactly once).
 */
export async function releaseOrderInventory(tx: Prisma.TransactionClient, orderRowId: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderRowId },
    select: { couponId: true, items: { select: { productId: true, quantity: true } } },
  });

  for (const item of order.items) {
    // Deleted products have nothing to restock.
    if (!item.productId) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }

  if (order.couponId) {
    await tx.coupon.updateMany({
      where: { id: order.couponId, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }
}
