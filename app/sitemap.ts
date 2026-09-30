import type { MetadataRoute } from "next";
import { prisma } from "../lib/prisma";
import { getSiteUrl } from "../lib/site";

// Rebuilt at most hourly so new products appear without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, category: { isActive: true } },
      select: { slug: true, updatedAt: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ where: { isActive: true }, select: { name: true, updatedAt: true } }),
  ]);

  const absolute = (url: string) => (url.startsWith("/") ? `${site}${url}` : url);

  return [
    { url: site, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/products`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((category) => ({
      url: `${site}/products?category=${encodeURIComponent(category.name)}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${site}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: product.images.map((image) => absolute(image.url)),
    })),
    { url: `${site}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site}/contact`, changeFrequency: "monthly", priority: 0.5 },
    ...["/privacy-policy", "/terms-and-conditions", "/shipping-policy", "/return-refund-policy"].map((path) => ({
      url: `${site}${path}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
