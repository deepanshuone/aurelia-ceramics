import { prisma } from "./prisma";

/**
 * Whether the customer has actually received the product. Anyone signed in may
 * review, but only these customers get the "Verified buyer" label.
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

/** Customer photos per review, and the largest file we accept (photos are resized in the browser first). */
export const MAX_REVIEW_PHOTOS = 4;
export const MAX_REVIEW_PHOTO_BYTES = 1_500_000;

/**
 * The image type from the file's first bytes (never from the upload's own
 * label), or null when it isn't a JPEG, PNG or WebP.
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) {
    return "image/png";
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export const reviewPhotoUrl = (photoId: string) => `/api/reviews/photos/${photoId}`;

/**
 * Marks a customer's existing reviews as verified once an order containing the
 * product is delivered (they may have reviewed before it arrived).
 */
export async function verifyReviewsForOrder(orderRowId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderRowId },
    select: { customerId: true, status: true, items: { select: { productId: true } } },
  });
  // Guest checkout orders have no account, so no reviews to verify.
  if (!order?.customerId || order.status !== "DELIVERED") return [];
  const productIds = order.items.map((item) => item.productId).filter((id): id is string => Boolean(id));
  if (productIds.length === 0) return [];

  const reviews = await prisma.review.findMany({
    where: { customerId: order.customerId, productId: { in: productIds }, isVerifiedPurchase: false },
    select: { id: true, product: { select: { slug: true } } },
  });
  if (reviews.length === 0) return [];
  await prisma.review.updateMany({
    where: { id: { in: reviews.map((review) => review.id) } },
    data: { isVerifiedPurchase: true },
  });
  return reviews.map((review) => review.product.slug);
}
