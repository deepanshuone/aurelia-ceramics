import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";
import { normalize, searchCategories, searchProducts } from "../../../../lib/search";

// Search-as-you-type suggestions. The ranking (typos, plurals, synonyms, codes,
// price phrases…) lives in lib/search.ts and runs over an in-memory index.
export async function GET(request: NextRequest) {
  if (!rateLimit(`suggest:${clientIp(request.headers)}`, 300, 60 * 1000).allowed) {
    return NextResponse.json({ suggestions: [], categories: [], total: 0 }, { status: 429 });
  }

  // Capped so long inputs stay cheap; control characters are stripped by normalize().
  const query = request.nextUrl.searchParams.get("q")?.slice(0, 60) ?? "";
  if (normalize(query).length < 2) {
    return NextResponse.json({ suggestions: [], categories: [], total: 0 });
  }

  const [result, categories] = await Promise.all([searchProducts(query), searchCategories(query)]);
  const suggestions = result.entries.slice(0, 6).map((product) => ({
    name: product.name,
    slug: product.slug,
    price: product.price,
    image: product.image,
    category: product.category,
  }));

  return NextResponse.json(
    { suggestions, categories, total: result.total, corrected: result.corrected, partial: result.partial },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
