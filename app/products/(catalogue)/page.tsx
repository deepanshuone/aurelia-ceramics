import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { searchCategories, searchProducts } from "../../../lib/search";
import { shownRating } from "../../../lib/sample-ratings";
import { getShowSampleRatings } from "../../../lib/store-settings";
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
  colour?: string;
  material?: string;
  rating?: string;
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

// Ways to order the catalogue. "relevance" only exists while searching.
const SORTS = ["relevance", "popularity", "newest", "price-asc", "price-desc", "rating"] as const;

type CatalogueFilters = {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  colour: string;
  material: string;
  minRating: number;
  sort: string;
  page: number;
};

type SearchInfo = {
  corrected: string | null;
  partial: boolean;
  priceHint: { min?: number; max?: number } | null;
};

type FacetOption = { value: string; count: number };

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : 1);

function countBy(values: string[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/**
 * The catalogue, browsing or searching: lib/search.ts ranks and filters the
 * visible products in memory (typos, synonyms, codes, price phrases, colour,
 * material, rating), then the list is re-sorted if the shopper asked, and paged.
 *
 * Cached per filter combination for 5 minutes (and dropped immediately when an
 * admin edits products/categories via revalidateTag), so browsing rarely
 * touches the database, which on Neon's free tier can take seconds to wake up.
 */
const getCatalogue = unstable_cache(
  async (filters: CatalogueFilters) => {
    const min = filters.minPrice ? Number(filters.minPrice) : NaN;
    const max = filters.maxPrice ? Number(filters.maxPrice) : NaN;
    const category = filters.category && filters.category !== "All Products" ? filters.category : undefined;

    const [result, scope, dbCategories, categoryMatches] = await Promise.all([
      searchProducts(filters.search, {
        category,
        minPrice: Number.isNaN(min) ? undefined : min,
        maxPrice: Number.isNaN(max) ? undefined : max,
        inStock: filters.inStock,
        colour: filters.colour || undefined,
        material: filters.material || undefined,
        minRating: filters.minRating || undefined,
      }),
      // The same search without the narrower filters: the colour, material and
      // rating choices are worked out from these, so none of them leads nowhere.
      searchProducts(filters.search, { category }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { name: true },
      }),
      filters.search ? searchCategories(filters.search) : Promise.resolve([]),
    ]);

    let entries = result.entries;
    if (filters.sort === "price-asc") entries = [...entries].sort((a, b) => a.price - b.price || byId(a, b));
    else if (filters.sort === "price-desc") entries = [...entries].sort((a, b) => b.price - a.price || byId(a, b));
    else if (filters.sort === "newest") entries = [...entries].sort((a, b) => b.createdAt - a.createdAt || byId(a, b));
    else if (filters.sort === "rating") {
      // Only real reviews count; unreviewed products go last, newest first.
      const score = (e: (typeof entries)[number]) => (e.reviewCount > 0 ? (e.rating ?? 0) : -1);
      entries = [...entries].sort(
        (a, b) => score(b) - score(a) || b.reviewCount - a.reviewCount || b.createdAt - a.createdAt || byId(a, b)
      );
    } else if (filters.sort === "popularity") {
      // Best sellers first (how many times a product has been ordered).
      const counts = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: { productId: { in: entries.map((entry) => entry.id) } },
        _count: { _all: true },
      });
      const sold = new Map(counts.map((row) => [row.productId, row._count._all]));
      entries = [...entries].sort(
        (a, b) => (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0) || b.reviewCount - a.reviewCount || byId(a, b)
      );
    }

    const totalProducts = entries.length;
    const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
    const page = Math.min(Math.max(filters.page, 1), totalPages);

    // Nothing found: a few well-liked products to keep the shopper going.
    const picks =
      totalProducts === 0
        ? (await searchProducts("", { inStock: true })).entries.slice(0, 4)
        : [];

    const toCard = (entry: (typeof entries)[number]) => ({
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      code: entry.code,
      price: entry.price,
      mrp: entry.mrp,
      stock: entry.stock,
      rating: entry.rating,
      reviewCount: entry.reviewCount,
      category: { name: entry.category },
      image: entry.image,
    });

    return {
      totalProducts,
      totalPages,
      page,
      searchInfo: filters.search
        ? ({ corrected: result.corrected, partial: result.partial, priceHint: result.priceHint } as SearchInfo)
        : null,
      categories: dbCategories.map((c) => c.name),
      // Categories the search words point at ("mug" → Cups & Mugs), unless already chosen.
      categoryMatches: categoryMatches.filter((c) => c.name !== category),
      facets: {
        colours: countBy(scope.entries.flatMap((e) => e.colours)),
        materials: countBy(scope.entries.flatMap((e) => (e.material ? [e.material] : []))),
        rated: scope.entries.some((e) => e.reviewCount > 0),
      },
      products: entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(toCard),
      picks: picks.map(toCard),
    };
  },
  ["catalogue-v3"],
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
  const sort =
    params.sort && (SORTS as readonly string[]).includes(params.sort) && (search || params.sort !== "relevance")
      ? params.sort
      : defaultSort;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const colour = params.colour?.trim().slice(0, 40) ?? "";
  const material = params.material?.trim().slice(0, 40) ?? "";
  const ratingParam = Number.parseInt(params.rating ?? "", 10);
  const minRating = ratingParam >= 1 && ratingParam <= 5 ? ratingParam : 0;

  const [catalogue, showSampleRatings] = await Promise.all([
    getCatalogue({
    search,
    category,
    minPrice: params.minPrice ?? "",
    maxPrice: params.maxPrice ?? "",
    inStock,
    colour,
    material,
    minRating,
    sort,
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
    }),
    getShowSampleRatings(),
  ]);
  const { categories, categoryMatches, facets, totalProducts, totalPages, page, searchInfo } = catalogue;
  // Sample ratings are added after the cache, so switching them off takes effect at once.
  const withRating = (card: (typeof catalogue.products)[number]) => ({
    ...card,
    rating: shownRating(card, showSampleRatings).rating,
  });
  const products = catalogue.products.map(withRating);
  const picks = catalogue.picks.map(withRating);

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

          {categoryMatches.length > 0 && (
            <div className="search-category-matches">
              <span>Shop the category</span>
              {categoryMatches.map((c) => (
                <Link
                  key={c.name}
                  href={`/products?category=${encodeURIComponent(c.name)}${c.whole ? "" : `&search=${encodeURIComponent(search)}`}`}
                >
                  {c.name} <small>{c.count}</small>
                </Link>
              ))}
            </div>
          )}

          <ProductFilters
            categories={categories}
            facets={facets}
            current={{
              search,
              category,
              minPrice: params.minPrice ?? "",
              maxPrice: params.maxPrice ?? "",
              inStock,
              colour,
              material,
              rating: minRating ? String(minRating) : "",
              sort,
            }}
          />

          {products.length === 0 ? (
            <>
            <div className="catalogue-empty">
              <p>
                {search
                  ? `No products found for "${search}".`
                  : "No products match these filters."}
              </p>
              <span>
                {search
                  ? "Check the spelling, try a shorter or more general word (like \u201cmug\u201d or \u201cplate\u201d), or clear your filters."
                  : "Try removing a filter or widening the price range."}
              </span>
              <div className="catalogue-empty-links">
                <span>Browse by category</span>
                {categories.map((name) => (
                  <Link key={name} href={`/products?category=${encodeURIComponent(name)}`}>
                    {name}
                  </Link>
                ))}
              </div>
            </div>
            {picks.length > 0 && (
              <div className="catalogue-empty-picks">
                <p className="catalogue-label">YOU MIGHT LIKE</p>
                <ProductCatalogue products={picks} />
              </div>
            )}
            </>
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
                  colour: colour || undefined,
                  material: material || undefined,
                  rating: minRating ? String(minRating) : undefined,
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
