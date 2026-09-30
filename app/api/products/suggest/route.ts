import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  // Capped so long inputs can't turn into expensive LIKE scans.
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 60) ?? "";

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      category: { isActive: true },
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { category: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    select: {
      name: true,
      slug: true,
      price: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  const suggestions = products.map((product) => ({
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    image: product.images[0]?.url ?? "/placeholder-product.svg",
  }));

  return NextResponse.json({ suggestions });
}
