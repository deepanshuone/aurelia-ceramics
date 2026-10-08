import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { rateLimit } from "../../../lib/rate-limit";
import {
  MAX_REVIEW_PHOTO_BYTES,
  MAX_REVIEW_PHOTOS,
  hasReceivedProduct,
  refreshProductRating,
  reviewPhotoUrl,
  sniffImageType,
} from "../../../lib/reviews";

const reviewSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  rating: z.coerce.number().int().min(1, "Please choose a star rating.").max(5, "Please choose a star rating."),
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
    select: {
      rating: true,
      title: true,
      comment: true,
      photos: { orderBy: { sortOrder: "asc" }, select: { id: true } },
    },
  });
  return NextResponse.json({
    loggedIn: true,
    canReview: true,
    verified,
    existing: existing
      ? {
          rating: existing.rating,
          title: existing.title ?? "",
          comment: existing.comment ?? "",
          photos: existing.photos.map((photo) => ({ id: photo.id, url: reviewPhotoUrl(photo.id) })),
        }
      : null,
  });
}

// Create or update the signed-in customer's review of a product. Sent as
// multipart form data: the review fields, `keepPhoto` (ids of photos already
// on the review to keep) and `photo` (new image files).
export async function POST(request: Request) {
  const session = await auth();
  const customerId = session?.user?.id;
  if (!customerId) {
    return NextResponse.json({ error: "Please log in to write a review." }, { status: 401 });
  }

  if (!rateLimit(`review:${customerId}`, 10, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many reviews in a short time. Please try later." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid review." }, { status: 400 });

  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : undefined;
  };
  const parsed = reviewSchema.safeParse({
    slug: text("slug"),
    rating: text("rating"),
    title: text("title"),
    comment: text("comment"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review." }, { status: 400 });
  }
  const { slug, rating, title, comment } = parsed.data;

  const keepIds = form.getAll("keepPhoto").filter((value): value is string => typeof value === "string");
  const files = form.getAll("photo").filter((value): value is File => value instanceof File && value.size > 0);
  if (keepIds.length + files.length > MAX_REVIEW_PHOTOS) {
    return NextResponse.json({ error: `You can add up to ${MAX_REVIEW_PHOTOS} photos.` }, { status: 400 });
  }

  const newPhotos: { mimeType: string; data: Uint8Array<ArrayBuffer> }[] = [];
  for (const file of files) {
    if (file.size > MAX_REVIEW_PHOTO_BYTES) {
      return NextResponse.json({ error: "One of the photos is too large. Please choose a smaller one." }, { status: 400 });
    }
    const data = new Uint8Array(await file.arrayBuffer());
    const mimeType = sniffImageType(data);
    if (!mimeType) {
      return NextResponse.json({ error: "Photos must be JPEG, PNG or WebP images." }, { status: 400 });
    }
    newPhotos.push({ mimeType, data });
  }

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

  await prisma.$transaction(async (tx) => {
    const review = await tx.review.upsert({
      where: { productId_customerId: { productId: product.id, customerId } },
      create: { productId: product.id, customerId, rating, title, comment, isVerifiedPurchase },
      update: { rating, title, comment, isVerifiedPurchase },
      select: { id: true },
    });

    // Only this review's own photos can be kept; anything else in keepPhoto is ignored.
    await tx.reviewPhoto.deleteMany({ where: { reviewId: review.id, id: { notIn: keepIds } } });
    const kept = await tx.reviewPhoto.count({ where: { reviewId: review.id } });
    if (newPhotos.length > 0) {
      await tx.reviewPhoto.createMany({
        data: newPhotos.map((photo, i) => ({ reviewId: review.id, ...photo, sortOrder: kept + i })),
      });
    }
  });
  await refreshProductRating(product.id);

  revalidatePath(`/products/${slug}`);
  return NextResponse.json({ ok: true }, { status: 201 });
}
