import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import {
  ORDER_PROGRESS,
  ORDER_STATUS_LABELS,
  paymentLabel,
  formatOrderDate,
  formatRupees,
} from "../../../../lib/order-display";
import PayNowButton from "../../../../components/PayNowButton";
import CodFallbackButton from "../../../../components/CodFallbackButton";
import { processingProgress } from "../../../../lib/processing";
import { getStoreProcessingDays } from "../../../../lib/store-settings";
import {
  PAYMENT_WINDOW_MINUTES,
  expireStaleOrders,
  isPaymentWindowOpen,
} from "../../../../lib/payments";

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
  const order = await prisma.order.findFirst({
    where: { orderId, customerId: session.user.id },
    include: {
      coupon: { select: { code: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: {
              slug: true,
              isActive: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const isClosed = order.status === "CANCELLED" || order.status === "REFUNDED";
  const awaitingPayment =
    order.paymentMethod === "ONLINE" &&
    order.status === "PENDING" &&
    order.paymentStatus !== "PAID" &&
    isPaymentWindowOpen(order);
  const progressIndex = ORDER_PROGRESS.indexOf(order.status);
  const discount = Number(order.discount);
  const delivery = Number(order.delivery);
  const refunded = Number(order.refundedAmount);
  const processing = processingProgress(order, await getStoreProcessingDays());

  return (
    <main className="orders-page">
      <div className="orders-container">
        <Link href="/account/orders" className="back-link">
          ← Back to Orders
        </Link>

        {/* HEADER */}

        <div className="orders-header">
          <p className="section-label">ORDER DETAILS</p>

          <h1>
            Order
            <br />
            <em>{order.orderId}</em>
          </h1>

          <p>Placed on {formatOrderDate(order.createdAt)}</p>
        </div>

        {/* STATUS */}

        <div className="order-detail-status">
          <div className="order-status-grid">
            <div>
              <span>ORDER STATUS</span>
              <strong className={`status-${order.status.toLowerCase()}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </strong>
            </div>

            <div>
              <span>PAYMENT</span>
              <strong className={`payment-${order.paymentStatus.toLowerCase()}`}>
                {paymentLabel(order.paymentMethod, order.paymentStatus)}
              </strong>
            </div>

            {order.trackingNumber && (
              <div>
                <span>TRACKING</span>
                <strong>
                  {order.trackingCarrier ? `${order.trackingCarrier} · ` : ""}
                  {order.trackingNumber}
                </strong>
              </div>
            )}
          </div>

          {isClosed ? (
            <p className="order-closed-note">
              {order.status === "CANCELLED" ? "This order was cancelled" : "This order was refunded"}
              {order.cancelReason ? `: ${order.cancelReason}` : "."}
              {refunded > 0 && ` ${formatRupees(refunded)} has been refunded.`}
            </p>
          ) : (
            <ol className="order-timeline">
              {ORDER_PROGRESS.map((step, index) => (
                <li
                  key={step}
                  className={
                    index < progressIndex ? "done" : index === progressIndex ? "current" : undefined
                  }
                  aria-current={index === progressIndex ? "step" : undefined}
                >
                  <span className="order-timeline-dot" />
                  {ORDER_STATUS_LABELS[step]}
                </li>
              ))}
            </ol>
          )}

          {processing && (
            <div className="order-processing">
              <div className="processing-meter" role="progressbar" aria-valuenow={processing.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Order preparation progress">
                <span style={{ width: `${processing.percent}%` }} />
              </div>
              <p>
                {processing.overdue
                  ? "Your order is being prepared and will ship shortly."
                  : `Your order is being prepared · ready to ship by ${formatOrderDate(processing.readyBy)}`}
              </p>
            </div>
          )}
        </div>

        {awaitingPayment && (
          <div className="order-pay-panel">
            <div>
              <strong>
                {order.paymentStatus === "FAILED" ? "Your last payment attempt failed." : "Payment pending."}
              </strong>
              <p>
                Complete payment within {PAYMENT_WINDOW_MINUTES} minutes of placing the order, or it
                will be cancelled automatically. Or switch to Cash on Delivery and pay when it arrives.
              </p>
            </div>
            <div className="order-pay-actions">
              <PayNowButton orderId={order.orderId} label={`Pay ${formatRupees(order.total)}`} />
              <CodFallbackButton orderId={order.orderId} />
            </div>
          </div>
        )}

        <div className="order-detail-layout">
          {/* LEFT */}

          <div>
            {/* PRODUCTS */}

            <section className="order-detail-section">
              <div className="checkout-section-title">
                <span>01</span>
                <h2>Products</h2>
              </div>

              {order.items.map((item) => {
                // The product may since have been deleted; the order line keeps its own name and price.
                const image = item.product?.images[0]?.url ?? "/placeholder-product.svg";
                const productSlug = item.product?.isActive ? item.product.slug : null;

                return (
                  <div className="order-detail-product" key={item.id}>
                    <img src={image} alt={item.name} />

                    <div>
                      <h3>
                        {productSlug ? (
                          <Link href={`/products/${productSlug}`}>{item.name}</Link>
                        ) : (
                          item.name
                        )}
                      </h3>

                      <p>
                        {formatRupees(item.price)} × {item.quantity}
                      </p>

                      <strong>{formatRupees(Number(item.price) * item.quantity)}</strong>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* CUSTOMER */}

            <section className="order-detail-section">
              <div className="checkout-section-title">
                <span>02</span>
                <h2>Contact Information</h2>
              </div>

              <div className="customer-details">
                <p>
                  <span>Name</span>
                  <strong>{order.shippingName}</strong>
                </p>

                <p>
                  <span>Phone</span>
                  <strong>{order.shippingPhone}</strong>
                </p>

                <p>
                  <span>Email</span>
                  <strong>{order.shippingEmail}</strong>
                </p>
              </div>
            </section>

            {/* ADDRESS */}

            <section className="order-detail-section">
              <div className="checkout-section-title">
                <span>03</span>
                <h2>Delivery Address</h2>
              </div>

              <p className="detail-address">
                {order.shippingAddress}
                <br />
                {order.shippingCity}, {order.shippingState} – {order.shippingPin}
              </p>
            </section>
          </div>

          {/* RIGHT — SUMMARY */}

          <aside className="order-detail-summary">
            <p className="section-label">ORDER SUMMARY</p>

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatRupees(order.subtotal)}</strong>
            </div>

            {discount > 0 && (
              <div className="summary-row discount">
                <span>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                <strong>−{formatRupees(discount)}</strong>
              </div>
            )}

            <div className="summary-row">
              <span>Delivery</span>
              <strong>{delivery === 0 ? "FREE" : formatRupees(delivery)}</strong>
            </div>

            <div className="summary-line" />

            <div className="summary-total">
              <span>Total</span>
              <strong>{formatRupees(order.total)}</strong>
            </div>

            {refunded > 0 && (
              <div className="summary-row">
                <span>Refunded</span>
                <strong>−{formatRupees(refunded)}</strong>
              </div>
            )}

            <div className="order-help">
              Questions about this order?{" "}
              <Link href="/contact">Contact us</Link> and mention{" "}
              <strong>{order.orderId}</strong>.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
