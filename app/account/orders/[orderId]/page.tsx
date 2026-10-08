import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "../../../../auth";
import OrderDetailView, { loadOrderDetail } from "../../../../components/OrderDetailView";
import { expireStaleOrders } from "../../../../lib/payments";

type Params = { params: Promise<{ orderId: string }> };

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false },
};

export default async function AccountOrderDetailPage({ params }: Params) {
  const { orderId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/account/orders/${encodeURIComponent(orderId)}`);
  }

  await expireStaleOrders(session.user.id);

  // Scoped to the logged-in customer: another customer's order ID is a 404,
  // not a permission error, so order IDs can't be probed.
  const order = await loadOrderDetail({ orderId, customerId: session.user.id });
  if (!order) notFound();

  return <OrderDetailView order={order} back={{ href: "/account/orders", label: "Back to Orders" }} />;
}
