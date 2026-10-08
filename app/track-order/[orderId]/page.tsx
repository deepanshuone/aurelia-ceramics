import type { Metadata } from "next";
import Link from "next/link";
import CheckoutSteps from "../../../components/CheckoutSteps";
import OrderDetailView, { loadOrderDetail } from "../../../components/OrderDetailView";
import { orderAccessWhere } from "../../../lib/order-access";
import { expireStaleOrders } from "../../../lib/payments";

export const metadata: Metadata = {
  title: "Track Order",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ t?: string }>;
};

// One order, opened with its signed link (guest checkout) or by the signed-in
// customer it belongs to. The order ID alone shows nothing.
export default async function TrackOrderDetailPage({ params, searchParams }: Props) {
  const { orderId } = await params;
  const { t } = await searchParams;

  const access = await orderAccessWhere(orderId, t);
  if (access) await expireStaleOrders(access.customerId);
  const order = access ? await loadOrderDetail(access) : null;

  if (!order) {
    return (
      <main className="order-success-page">
        <div className="success-card">
          <h1>Link Not Valid</h1>
          <p>
            This order link is incomplete or has been changed. Open the link from your order email, or
            request a new one.
          </p>
          <div className="success-actions">
            <Link href="/track-order" className="success-btn">
              Track Order
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const token = access && !access.customerId ? t : undefined;

  return (
    <>
      <div className="checkout-container" style={{ paddingTop: 40 }}>
        <CheckoutSteps current="Track" />
      </div>
      <OrderDetailView
        order={order}
        back={token ? { href: "/track-order", label: "Track another order" } : { href: "/account/orders", label: "Back to Orders" }}
        accessToken={token}
      />
    </>
  );
}
