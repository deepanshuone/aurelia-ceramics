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

// Whether the current visitor may review a product (and their existing review).
// Any signed-in customer can review; only people who received the product get
// the "Verified buyer" label.
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const session = await auth();
  const customerId = session?.user?.id;
  if (!customerId || !slug) {
    return NextResponse.json({ loggedIn: Boolean(customerId), canReview: false, verified: false, existing: null });
  }

  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) {
    return NextResponse.json({ loggedIn: true, canReview: false, verified: false, existing: null });
  }
  const verified = await hasReceivedProduct(customerId, product.id);

  const existing = await prisma.review.findUnique({
    where: { productId_customerId: { productId: product.id, customerId } },
    select: { rating: true, title: true, comment: true },
  });
  return NextResponse.json({
    loggedIn: true,
    canReview: true,
    verified,
    existing: existing ? { rating: existing.rating, title: existing.title ?? "", comment: existing.comment ?? "" } : null,
  });
}

// Create or update the signed-in customer's review of a product.
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

  // Login tokens outlive an admin blocking the account, so check it here.
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { isActive: true } });
  if (!customer?.isActive) {
    return NextResponse.json({ error: "Your account can't post reviews. Please contact us." }, { status: 403 });
  }

  // The label comes from the database, never from the request.
  const isVerifiedPurchase = await hasReceivedProduct(customerId, product.id);

  await prisma.review.upsert({
    where: { productId_customerId: { productId: product.id, customerId } },
    create: { productId: product.id, customerId, rating, title, comment, isVerifiedPurchase },
    update: { rating, title, comment, isVerifiedPurchase },
  });
  await refreshProductRating(product.id);

  revalidatePath(`/products/${slug}`);
  return NextResponse.json({ ok: true }, { status: 201 });
}
