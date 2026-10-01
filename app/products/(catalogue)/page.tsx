import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { Prisma } from "../../../lib/generated/prisma/client";
import { searchProducts } from "../../../lib/search";
import ProductCatalogue from "../../../components/ProductCatalogue";
import ProductFilters from "../../../components/ProductFilters";
import CataloguePagination from "../../../components/CataloguePagination";

const HERO_IMAGE = "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=1600&q=70";

const PAGE_SIZE = 24;

type SearchParams = {
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sort?: string;
  page?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const search = params.search?.trim();
  const category = params.category?.trim();

  return {
    title: search
      ? `Search results for "${search.slice(0, 60)}"`
      : category
        ? `Ceramic ${category.slice(0, 60)}`
        : "Shop Ceramic Tableware",
    description:
      "Browse our full collection of premium ceramic crockery - dinner sets, plates, bowls, mugs, tea sets, jars, planters and hand-painted Khurja pottery.",
    // Sort/filter variations point at one canonical listing per category.
    alternates: {
      canonical: category ? `/products?category=${encodeURIComponent(category)}` : "/products",
    },
    // Internal search results are thin/duplicate content.
    ...(search ? { robots: { index: false, follow: true } } : {}),
  };
}

const SORT_OPTIONS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  "price-asc": { price: "asc" },
  "price-desc": { price: "desc" },
  // Best sellers first (how many times a product has been ordered).
  popularity: { orderItems: { _count: "desc" } },
  // Only meaningful while searching (the ranking comes from lib/search.ts);
  // without a search it behaves like "newest".
  relevance: { createdAt: "desc" },
};

type CatalogueFilters = {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: string;
  page: number;
};

type SearchInfo = {
  corrected: string | null;
  partial: boolean;
  priceHint: { min?: number; max?: number } | null;
};

/**
 * Search results: ranked by lib/search.ts (typos, plurals, synonyms, codes,
 * price phrases), then filtered, re-sorted if the shopper asked, and paged.
 */
async function searchCatalogue(filters: CatalogueFilters) {
  const min = filters.minPrice ? Number(filters.minPrice) : NaN;
  const max = filters.maxPrice ? Number(filters.maxPrice) : NaN;
  const result = await searchProducts(filters.search, {
    category: filters.category || undefined,
    minPrice: Number.isNaN(min) ? undefined : min,
    maxPrice: Number.isNaN(max) ? undefined : max,
    inStock: filters.inStock,
  });

  let entries = result.entries;
  if (filters.sort === "price-asc") entries = [...entries].sort((a, b) => a.price - b.price || (a.id < b.id ? -1 : 1));
  else if (filters.sort === "price-desc") entries = [...entries].sort((a, b) => b.price - a.price || (a.id < b.id ? -1 : 1));
  else if (filters.sort === "newest") entries = [...entries].sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? -1 : 1));
  else if (filters.sort === "popularity") {
    const counts = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { in: entries.map((entry) => entry.id) } },
      _count: { _all: true },
    });
    const sold = new Map(counts.map((row) => [row.productId, row._count._all]));
    entries = [...entries].sort((a, b) => (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0) || (a.id < b.id ? -1 : 1));
  }

  const totalProducts = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const page = Math.min(Math.max(filters.page, 1), totalPages);

  const dbCategories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { name: true },
  });

  return {
    totalProducts,
    totalPages,
    page,
    searchInfo: { corrected: result.corrected, partial: result.partial, priceHint: result.priceHint } as SearchInfo | null,
    categories: dbCategories.map((c) => c.name),
    products: entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((entry) => ({
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      code: entry.code,
      price: entry.price,
      mrp: entry.mrp,
      stock: entry.stock,
      rating: entry.rating,
      category: { name: entry.category },
      image: entry.image,
    })),
  };
}

/**
 * Catalogue query, cached per filter combination for 5 minutes (and dropped
 * immediately when an admin edits products/categories via revalidateTag).
 * Browsing therefore rarely touches the database, which on Neon's free tier
 * can take several seconds to wake up.
 */
const getCatalogue = unstable_cache(
  async (filters: CatalogueFilters) => {
    if (filters.search) return searchCatalogue(filters);

    const where: Prisma.ProductWhereInput = { isActive: true, category: { isActive: true } };

    if (filters.category && filters.category !== "All Products") {
      // Keep the visibility check: a hidden category stays hidden even by name.
      where.category = { name: filters.category, isActive: true };
    }

    const minPrice = filters.minPrice ? Number(filters.minPrice) : NaN;
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : NaN;
    if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
      where.price = {};
      if (!Number.isNaN(minPrice)) where.price.gte = minPrice;
      if (!Number.isNaN(maxPrice)) where.price.lte = maxPrice;
    }

    if (filters.inStock) {
      where.stock = { gt: 0 };
    }

    const totalProducts = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
    const page = Math.min(Math.max(filters.page, 1), totalPages);

    const [dbProducts, dbCategories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
        // id as a tie-breaker keeps page boundaries stable.
        orderBy: [SORT_OPTIONS[filters.sort], { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { name: true },
      }),
    ]);

    return {
      totalProducts,
      totalPages,
      page,
      searchInfo: null as SearchInfo | null,
      categories: dbCategories.map((c) => c.name),
      products: dbProducts.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        code: product.code,
        price: Number(product.price),
        mrp: product.mrp ? Number(product.mrp) : null,
        stock: product.stock,
        rating: product.rating ? Number(product.rating) : null,
        category: { name: product.category.name },
        image: product.images[0]?.url ?? "/placeholder-product.svg",
      })),
    };
  },
  ["catalogue"],
  { revalidate: 300, tags: ["products"] }
);

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const inStock = params.inStock === "1";
  // Searching ranks by relevance unless the shopper picks another order.
  const defaultSort = search ? "relevance" : "newest";
  const sort = params.sort && SORT_OPTIONS[params.sort] && (search || params.sort !== "relevance") ? params.sort : defaultSort;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);

  const { products, categories, totalProducts, totalPages, page, searchInfo } = await getCatalogue({
    search,
    category,
    minPrice: params.minPrice ?? "",
    maxPrice: params.maxPrice ?? "",
    inStock,
    sort,
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
  });

  return (
    <main className="products-page">
      {/* HEADER */}
      <section className="products-hero">
        <Image src={HERO_IMAGE} alt="" fill priority sizes="100vw" quality={65} className="hero-bg" />
        <div className="products-hero-overlay" />

        <div className="products-hero-content">
          <p>OUR COLLECTION</p>

          <h1>
            Ceramic tableware
            <br />
            <em>made to impress.</em>
          </h1>

          <span>
            Explore our collection of thoughtfully designed ceramic crockery
            for homes, hospitality and business.
          </span>
        </div>
      </section>

      {/* CATALOGUE */}
      <section className="catalogue">
        <div className="catalogue-container">
          <div className="catalogue-top">
            <div>
              <p className="catalogue-label">COLLECTIONS</p>
              <h2>
                {search ? `Results for "${search}"` : "Explore Products"}
              </h2>
            </div>

            <p className="product-count">
              {totalProducts} {totalProducts === 1 ? "Product" : "Products"}
            </p>
          </div>

          {searchInfo && (searchInfo.corrected || searchInfo.partial || searchInfo.priceHint) && (
            <p className="search-note" role="status">
              {searchInfo.partial ? (
                <>No product matches every word of &quot;{search}&quot;, so these are the closest ones.</>
              ) : searchInfo.corrected ? (
                <>
                  Showing results for <strong>{searchInfo.corrected}</strong>.
                </>
              ) : null}
              {searchInfo.priceHint && (
                <>
                  {" "}
                  {searchInfo.priceHint.min ? `From ₹${searchInfo.priceHint.min.toLocaleString("en-IN")} ` : ""}
                  {searchInfo.priceHint.max ? `Up to ₹${searchInfo.priceHint.max.toLocaleString("en-IN")}` : ""}
                </>
              )}
            </p>
          )}

          <ProductFilters
            categories={categories}
            current={{
              search,
              category,
              minPrice: params.minPrice ?? "",
              maxPrice: params.maxPrice ?? "",
              inStock,
              sort,
            }}
          />

          {products.length === 0 ? (
            <div className="catalogue-empty">
              <p>
                {search
                  ? `No products found for "${search}".`
                  : "No products match these filters."}
              </p>
              <span>Try a different search term or clear your filters.</span>
              {search && (
                <div className="catalogue-empty-links">
                  <span>Browse by category</span>
                  {categories.map((name) => (
                    <Link key={name} href={`/products?category=${encodeURIComponent(name)}`}>
                      {name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <ProductCatalogue products={products} />
              <CataloguePagination
                page={page}
                totalPages={totalPages}
                params={{
                  search: search || undefined,
                  category: category || undefined,
                  minPrice: params.minPrice,
                  maxPrice: params.maxPrice,
                  inStock: inStock ? "1" : undefined,
                  sort: sort === defaultSort ? undefined : sort,
                }}
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
