import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export type NavCategory = { name: string; count: number };

/**
 * Visible categories (with visible-product counts) for the header menu.
 * Cached for 10 minutes; admin category/product edits refresh it via
 * revalidateTag("nav-categories").
 */
export const getNavCategories = unstable_cache(
  async (): Promise<NavCategory[]> => {
    const categories = await prisma.category.findMany({
      where: { isActive: true, products: { some: { isActive: true } } },
      orderBy: { name: "asc" },
      select: { name: true, _count: { select: { products: { where: { isActive: true } } } } },
    });
    return categories.map((category) => ({ name: category.name, count: category._count.products }));
  },
  ["nav-categories"],
  { revalidate: 600, tags: ["nav-categories"] }
);
