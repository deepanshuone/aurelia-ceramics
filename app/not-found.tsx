import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="product-not-found">
      <p>PAGE NOT FOUND</p>

      <h1>
        We couldn&apos;t find
        <br />
        that page.
      </h1>

      <p className="not-found-hint">It may have moved, or the link may be mistyped.</p>

      <div className="not-found-actions">
        <Link href="/products" className="primary-btn">
          Browse Products <span>→</span>
        </Link>
        <Link href="/" className="text-link">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
