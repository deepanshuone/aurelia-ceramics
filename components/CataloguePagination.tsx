import Link from "next/link";

/** Numbered pagination for the shop, keeping the current filters in each link. */
export default function CataloguePagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  // First, last, and two either side of the current page; gaps become "…".
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2
  );

  return (
    <nav className="catalogue-pagination" aria-label="Product pages">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev">
          ← Prev
        </Link>
      ) : (
        <span className="disabled">← Prev</span>
      )}

      {pages.map((n, index) => (
        <span key={n} className="catalogue-pagination-group">
          {index > 0 && n - pages[index - 1] > 1 && <span className="gap">…</span>}
          {n === page ? (
            <span className="current" aria-current="page">
              {n}
            </span>
          ) : (
            <Link href={href(n)}>{n}</Link>
          )}
        </span>
      ))}

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next">
          Next →
        </Link>
      ) : (
        <span className="disabled">Next →</span>
      )}
    </nav>
  );
}
