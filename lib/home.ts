import { prisma } from "./prisma";
import type { OrderStatus } from "./generated/prisma/client";
import { shownRating } from "./sample-ratings";
import { getShowSampleRatings } from "./store-settings";

/** Product shape used by the homepage cards and Quick View. */
export type HomeProduct = {
  slug: string;
  name: string;
  category: string;
  price: number;
  mrp: number | null;
  stock: number;
  /** Average of real customer reviews (or a sample rating when Admin → Settings allows); null otherwise. */
  rating: number | null;
  reviewCount: number;
  description: string | null;
  images: string[];
};

// Orders that actually went through (COD placed or payment captured).
const SOLD_STATUSES: OrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

const productSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  mrp: true,
  stock: true,
  rating: true,
  reviewCount: true,
  description: true,
  category: { select: { name: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 4, select: { url: true } },
};

const visible = { isActive: true, stock: { gt: 0 }, category: { isActive: true } };

type Row = Awaited<ReturnType<typeof findProducts>>[number];

function findProducts(args: Omit<NonNullable<Parameters<typeof prisma.product.findMany>[0]>, "select">) {
  return prisma.product.findMany({ ...args, select: productSelect });
}

function toHomeProduct(row: Row, showSampleRatings: boolean): HomeProduct {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category.name,
    price: Number(row.price),
    mrp: row.mrp ? Number(row.mrp) : null,
    stock: row.stock,
    rating: shownRating(row, showSampleRatings).rating,
    reviewCount: row.reviewCount,
    description: row.description,
    images: row.images.map((image) => image.url),
  };
}

/** The newest in-stock products. */
export async function getNewArrivals(limit: number) {
  const [rows, showSamples] = await Promise.all([
    findProducts({ where: visible, orderBy: { createdAt: "desc" }, take: limit }),
    getShowSampleRatings(),
  ]);
  return rows.map((row) => toHomeProduct(row, showSamples));
}

/**
 * Best sellers ranked by units sold in confirmed orders. While the store has
 * fewer real sellers than `limit`, the list is topped up with other in-stock
 * pieces (best rated first) and `soldCount` says how many are real sellers,
 * so the page can avoid calling the extras "best sellers".
 */
export async function getBestSellers(limit: number, exclude: string[] = []) {
  const sold = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, order: { status: { in: SOLD_STATUSES } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit * 3,
  });

  const rank = new Map(sold.map((row, index) => [row.productId as string, index]));
  const sellers = (await findProducts({ where: { ...visible, id: { in: [...rank.keys()] } } }))
    .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
    .slice(0, limit);

  const extras =
    sellers.length < limit
      ? await findProducts({
          where: { ...visible, slug: { notIn: exclude }, id: { notIn: sellers.map((p) => p.id) } },
          orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { reviewCount: "desc" }, { createdAt: "asc" }],
          take: limit - sellers.length,
        })
      : [];

  const showSamples = await getShowSampleRatings();
  return {
    products: [...sellers, ...extras].map((row) => toHomeProduct(row, showSamples)),
    soldCount: sellers.length,
  };
}

/** Real catalogue numbers for the brand story. */
export async function getCatalogueStats() {
  const [products, collections] = await Promise.all([
    prisma.product.count({ where: { isActive: true, category: { isActive: true } } }),
    prisma.category.count({ where: { isActive: true, products: { some: { isActive: true } } } }),
  ]);
  return { products, collections };
}
