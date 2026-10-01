"use server";

import { revalidatePath } from "next/cache";
import { type ActionState, requireAdmin } from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";
import { refreshProductRating } from "../../../lib/reviews";

/** Removes a review (e.g. spam or abuse) and recalculates the product rating. */
export async function deleteReview(reviewId: string): Promise<ActionState> {
  await requireAdmin();

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
