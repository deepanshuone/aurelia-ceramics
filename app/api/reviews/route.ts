import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { rateLimit } from "../../../lib/rate-limit";
import { hasReceivedProduct, refreshProductRating } from "../../../lib/reviews";

const reviewSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  rating: z.number().int().min(1, "Please choose a star rating.").max(5),
  title: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || null),
  comment: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => value || null),
});

// Create or update the signed-in customer's review of a product they received.
export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.id;
  if (!customerId) {
    return NextResponse.json({ error: "Please log in to write a review." }, { status: 401 });
  }

  if (!rateLimit(`review:${customerId}`, 10, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many reviews in a short time. Please try later." }, { status: 429 });
  }

  const parsed = reviewSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review." }, { status: 400 });
  }
  const { slug, rating, title, comment } = parsed.data;

  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true, isActive: true } });
  if (!product || !product.isActive) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  if (!(await hasReceivedProduct(customerId, product.id))) {
    return NextResponse.json(
      { error: "Only customers who have received this product can review it." },
      { status: 403 }
    );
  }

  await prisma.review.upsert({
    where: { productId_customerId: { productId: product.id, customerId } },
    create: { productId: product.id, customerId, rating, title, comment, isVerifiedPurchase: true },
    update: { rating, title, comment, isVerifiedPurchase: true },
  });
  await refreshProductRating(product.id);

  revalidatePath(`/products/${slug}`);
  return NextResponse.json({ ok: true }, { status: 201 });
}
