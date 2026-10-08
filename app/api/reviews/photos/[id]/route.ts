import { prisma } from "../../../../../lib/prisma";

// Serves a customer's review photo. Its type was checked from the file's bytes
// on upload, and nosniff (next.config.ts) stops browsers guessing another one.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await prisma.reviewPhoto.findUnique({
    where: { id },
    select: { mimeType: true, data: true, review: { select: { product: { select: { isActive: true } } } } },
  });
  if (!photo || !photo.review.product.isActive) return new Response("Not found", { status: 404 });

  return new Response(photo.data, {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(photo.data.byteLength),
      // A photo never changes; a deleted one drops out of the CDN within a day.
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Content-Disposition": "inline",
    },
  });
}
