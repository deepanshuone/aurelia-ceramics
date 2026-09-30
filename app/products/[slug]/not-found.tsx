import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="product-not-found">
      <p>PRODUCT NOT FOUND</p>

      <h1>
        We couldn&apos;t find
        <br />
        this product.
      </h1>

      <Link href="/products" className="primary-btn">
        Back to Products <span>→</span>
      </Link>
    </main>
  );
}
