import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import {
  ORDER_STATUS_LABELS,
  paymentLabel,
  formatOrderDate,
  formatRupees,
} from "../../../lib/order-display";
import { expireStaleOrders } from "../../../lib/payments";

export const metadata: Metadata = {
  title: "My Orders",
  robots: { index: false },
};

const PAGE_SIZE = 10;
// Thumbnails shown per order card; the rest are summarised as "+N more".
const PREVIEW_ITEMS = 3;

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/orders");
  }
  const customerId = session.user.id;

  await expireStaleOrders(customerId);

  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const totalOrders = await prisma.order.count({ where: { customerId } });
  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;

  const orders = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      orderId: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      total: true,
      _count: { select: { items: true } },
      items: {
        take: PREVIEW_ITEMS,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
          product: {
            select: {
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });

  if (totalOrders === 0) {
    return (
      <main className="orders-page">
        <div className="orders-container orders-empty">
          <p className="section-label">MY ORDERS</p>

          <h1>
            No orders
            <br />
            <em>yet.</em>
          </h1>

          <p>You have not placed any orders yet.</p>

          <Link href="/products" className="primary-btn">
            Start Shopping →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="orders-page">
      <div className="orders-container">
        <Link href="/account" className="back-link">
          ← Back to Account
        </Link>

        <div className="orders-header">
          <p className="section-label">MY ORDERS</p>

          <h1>
            Your
            <br />
            <em>orders.</em>
          </h1>
        </div>

        <div className="orders-list">
          {orders.map((order) => {
            const hiddenItems = order._count.items - order.items.length;

            return (
              <div className="order-card" key={order.orderId}>
                <div className="order-card-header">
                  <div>
                    <span>ORDER ID</span>
                    <strong>{order.orderId}</strong>
                  </div>

                  <div>
                    <span>ORDER DATE</span>
                    <strong>{formatOrderDate(order.createdAt)}</strong>
                  </div>

                  <div>
                    <span>STATUS</span>
                    <strong className={`order-status status-${order.status.toLowerCase()}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </strong>
                    {order.status !== "CANCELLED" && order.paymentStatus !== "PAID" && (
                      <small className={`payment-badge payment-${order.paymentStatus.toLowerCase()}`}>
                        {paymentLabel(order.paymentMethod, order.paymentStatus)}
                      </small>
                    )}
                  </div>
                </div>

                <div className="order-products">
                  {order.items.map((item) => (
                    <div className="order-product" key={item.id}>
                      <img
                        src={item.product?.images[0]?.url ?? "/placeholder-product.svg"}
                        alt={item.name}
                      />

                      <div className="order-product-info">
                        <h3>{item.name}</h3>
                        <p>Quantity: {item.quantity}</p>
                        <strong>{formatRupees(Number(item.price) * item.quantity)}</strong>
                      </div>
                    </div>
                  ))}

                  {hiddenItems > 0 && (
                    <p className="order-more-items">
                      + {hiddenItems} more item{hiddenItems === 1 ? "" : "s"}
                    </p>
                  )}
                </div>

                <div className="order-total">
                  <span>Total Amount</span>
                  <strong>{formatRupees(order.total)}</strong>
                </div>

                <Link href={`/account/orders/${order.orderId}`} className="view-order-btn">
                  View Order Details →
                </Link>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <nav className="orders-pagination" aria-label="Order pages">
            {page > 1 ? (
              <Link href={`/account/orders?page=${page - 1}`}>← Newer</Link>
            ) : (
              <span />
            )}

            <span>
              Page {page} of {totalPages}
            </span>

            {page < totalPages ? (
              <Link href={`/account/orders?page=${page + 1}`}>Older →</Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <div className="orders-actions">
          <Link href="/products" className="primary-btn">
            Continue Shopping →
          </Link>

          <Link href="/account" className="secondary-btn">
            My Account
          </Link>
        </div>
      </div>
    </main>
  );
}
