import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";

// Product suggestions for the cart page (empty or filled).
//   exclude  comma-separated slugs already in the cart
//   need     rupees still missing for free delivery (0 if already unlocked)
//   limit    how many to return (1–8)
//
// Ranking: same category as what is in the cart, featured/popular items, and —
// when free delivery is close — items that would close the gap on their own.
// Ties are shuffled by day, so the picks stay fresh without being random per request.

function dayHash(value: string) {
  const seed = `${value}:${new Date().toISOString().slice(0, 10)}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 1000;
}

export async function GET(request: Request) {
  if (!rateLimit(`recommend:${clientIp(request.headers)}`, 120, 60 * 1000).allowed) {
    return NextResponse.json({ products: [] }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const exclude = (params.get("exclude") ?? "")
    .split(",")
    .map((slug) => slug.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 30);
  const limit = Math.min(8, Math.max(1, Math.floor(Number(params.get("limit"))) || 4));
  const needRaw = Number(params.get("need"));
  const need = Number.isFinite(needRaw) ? Math.min(1_000_000, Math.max(0, Math.round(needRaw))) : 0;

  const inCart = exclude.length
    ? await prisma.product.findMany({ where: { slug: { in: exclude } }, select: { categoryId: true } })
    : [];
  const cartCategories = new Set(inCart.map((product) => product.categoryId));

  const include = {
    category: { select: { name: true } },
    images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
  };
  const base = {
    isActive: true,
    stock: { gt: 0 },
    category: { isActive: true },
    ...(exclude.length ? { slug: { notIn: exclude } } : {}),
  };

  // Three candidate sources, so a strong match is never cut off by the first
  // query's limit: popular overall, same category as the cart, and items that
  // would close the free-delivery gap on their own.
  const [popular, sameCategory, gapClosers] = await Promise.all([
    prisma.product.findMany({
      where: base,
      orderBy: [{ isFeatured: "desc" }, { reviewCount: "desc" }, { createdAt: "desc" }],
      take: 60,
      include,
    }),
    cartCategories.size
      ? prisma.product.findMany({
          where: { ...base, categoryId: { in: [...cartCategories] } },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: 30,
          include,
        })
      : Promise.resolve([]),
    need > 0
      ? prisma.product.findMany({
          where: { ...base, price: { gte: need } },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: 30,
          include,
        })
      : Promise.resolve([]),
  ]);
  const pool = [...new Map([...popular, ...sameCategory, ...gapClosers].map((product) => [product.id, product])).values()];

  const scored = pool
    .map((product) => {
      const price = Number(product.price);
      let score = 0;
      if (cartCategories.has(product.categoryId)) score += 2;
      if (product.isFeatured) score += 1;
      if (product.reviewCount > 0) score += Math.min(1, product.reviewCount / 10);
      // One more item that gets the customer to free delivery is a genuine saving.
      if (need > 0 && price >= need) score += 1.5;
      if (product.mrp && Number(product.mrp) > price) score += 0.3;
      return { product, price, score: score + dayHash(product.slug) / 10_000 };
    })
    .sort((a, b) => b.score - a.score);

  // Not four cards of the same category: take the best of each before repeating.
  const picked: typeof scored = [];
  const perCategory = new Map<string, number>();
  for (const item of scored) {
    const count = perCategory.get(item.product.categoryId) ?? 0;
    if (count >= 2) continue;
    perCategory.set(item.product.categoryId, count + 1);
    picked.push(item);
    if (picked.length === limit) break;
  }

  const products = picked.map(({ product, price }) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    code: product.code,
    price,
    mrp: product.mrp ? Number(product.mrp) : null,
    stock: product.stock,
    rating: product.rating ? Number(product.rating) : null,
    category: { name: product.category.name },
    image: product.images[0]?.url ?? "/placeholder-product.svg",
    note: need > 0 && price >= need ? "Gets you FREE delivery" : undefined,
  }));

  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
  );
}
