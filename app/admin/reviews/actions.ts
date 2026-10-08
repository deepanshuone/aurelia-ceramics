"use server";

import { revalidatePath } from "next/cache";
import { type ActionState, requirePermission } from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";
import { refreshProductRating } from "../../../lib/reviews";

/** Removes a review (e.g. spam or abuse) and recalculates the product rating. */
export async function deleteReview(reviewId: string): Promise<ActionState> {
  await requirePermission("reviews", "edit");

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { productId: true, product: { select: { slug: true } } },
  });
  if (!review) return { error: "Review not found." };

  await prisma.review.delete({ where: { id: reviewId } });
  await refreshProductRating(review.productId);

  revalidatePath("/admin/reviews");
  revalidatePath(`/products/${review.product.slug}`);
  return { success: "Review deleted." };
}

/** Removes one customer photo from a review (the review itself stays). */
export async function deleteReviewPhoto(photoId: string): Promise<ActionState> {
  await requirePermission("reviews", "edit");

  const photo = await prisma.reviewPhoto.findUnique({
    where: { id: photoId },
    select: { review: { select: { product: { select: { slug: true } } } } },
  });
  if (!photo) return { error: "Photo not found." };

  await prisma.reviewPhoto.delete({ where: { id: photoId } });

  revalidatePath("/admin/reviews");
  revalidatePath(`/products/${photo.review.product.slug}`);
  return { success: "Photo removed." };
}
