import Link from "next/link";

export default function OrderNotFound() {
  return (
    <main className="orders-page">
      <div className="orders-container orders-empty">
        <p className="section-label">ORDER</p>

        <h1>
          Order not
          <br />
          <em>found.</em>
        </h1>

        <p>We couldn&apos;t find this order on your account.</p>

        <Link href="/account/orders" className="primary-btn">
          Back to My Orders →
        </Link>
      </div>
    </main>
  );
}
