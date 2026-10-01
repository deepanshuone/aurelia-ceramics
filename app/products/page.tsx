import type { Metadata } from "next";
import { prisma } from "../../lib/prisma";
import { Prisma } from "../../lib/generated/prisma/client";
import ProductCatalogue from "../../components/ProductCatalogue";
import ProductFilters from "../../components/ProductFilters";
import CataloguePagination from "../../components/CataloguePagination";

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
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const inStock = params.inStock === "1";
  const sort = params.sort && SORT_OPTIONS[params.sort] ? params.sort : "newest";

  const where: Prisma.ProductWhereInput = { isActive: true, category: { isActive: true } };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (category && category !== "All Products") {
    // Keep the visibility check: a hidden category stays hidden even by name.
    where.category = { name: category, isActive: true };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      where.price.gte = minPrice;
    }
    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      where.price.lte = maxPrice;
    }
  }

  if (inStock) {
    where.stock = { gt: 0 };
  }

  const totalProducts = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;

  const [dbProducts, dbCategories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
      // id as a tie-breaker keeps page boundaries stable.
      orderBy: [SORT_OPTIONS[sort], { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const products = dbProducts.map((product) => ({
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
  }));

  const categories = dbCategories.map((c) => c.name);

  return (
    <main className="products-page">
      {/* HEADER */}
      <section className="products-hero">
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
                  sort: sort === "newest" ? undefined : sort,
                }}
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
