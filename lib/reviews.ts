import { prisma } from "./prisma";

/**
 * Only customers who have actually received a product may review it, so every
 * rating on the site is from a verified buyer.
 */
export async function hasReceivedProduct(customerId: string, productId: string) {
  const delivered = await prisma.orderItem.findFirst({
    where: { productId, order: { customerId, status: "DELIVERED" } },
    select: { id: true },
  });
  return Boolean(delivered);
}

/** Recomputes a product's average rating and review count from its reviews. */
export async function refreshProductRating(productId: string) {
  const stats = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: stats._count > 0 ? Math.round((stats._avg.rating ?? 0) * 100) / 100 : null,
      reviewCount: stats._count,
    },
  });
}

/** "Priya S." — first name plus last initial, to protect reviewers' privacy. */
export function reviewerDisplayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
