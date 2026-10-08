import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "../../lib/prisma";
import PayNowButton from "../../components/PayNowButton";
import CodFallbackButton from "../../components/CodFallbackButton";
import CheckoutSteps from "../../components/CheckoutSteps";
import { estimateDelivery, formatDeliveryEstimate } from "../../lib/delivery-estimate";
import { orderAccessWhere } from "../../lib/order-access";
import { orderDetailPath } from "../../lib/order-links";
import { formatOrderDate, formatRupees } from "../../lib/order-display";
import { getStoreProcessingDays } from "../../lib/store-settings";
import {
  EXPIRED_REASON,
  PAYMENT_WINDOW_MINUTES,
  expireStaleOrders,
  isPaymentWindowOpen,
} from "../../lib/payments";

export const metadata: Metadata = {
  title: "Order Placed",
  robots: { index: false },
};

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; payment?: string; t?: string }>;
}) {
  const { orderId, payment, t } = await searchParams;

  // The signed-in customer's own order, or a guest order through its signed
  // link: an order ID alone never shows anything.
  const access = orderId ? await orderAccessWhere(orderId, t) : null;
  // Guest orders keep their token on every link from here.
  const token = access && !access.customerId ? t : undefined;

  if (access) await expireStaleOrders(access.customerId);

  const order = access
    ? await prisma.order.findFirst({
        where: access,
        select: {
          orderId: true,
          total: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          createdAt: true,
          shippingEmail: true,
          cancelReason: true,
          confirmedAt: true,
          processingDays: true,
        },
      })
    : null;

  if (!order) {
    return (
      <main className="order-success-page">
        <div className="success-card">
          <h1>No Order Found</h1>
          <p>
            We could not find this order. If you checked out as a guest, open the link in your order
            email, or find it on the Track Order page.
          </p>

          <div className="success-actions">
            <Link href="/track-order" className="success-btn">
              Track Order
            </Link>

            <Link href="/products" className="secondary-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const detailHref = orderDetailPath(order.orderId, token);

  // A payment can land after the order was cancelled (refund pending), so
  // "paid" alone doesn't mean the order is going ahead.
  const cancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
  const paid = order.paymentStatus === "PAID" && !cancelled;
  const awaitingPayment = !paid && order.status === "PENDING" && isPaymentWindowOpen(order);

  const details = (
    <div className="order-details">
      <div>
        <span>Order ID</span>
        <strong>{order.orderId}</strong>
      </div>

      <div>
        <span>Order Total</span>
        <strong>{formatRupees(order.total)}</strong>
      </div>

      <div>
        <span>Order Date</span>
        <strong>{formatOrderDate(order.createdAt)}</strong>
      </div>
    </div>
  );

  const confirmedEstimate = async () =>
    formatDeliveryEstimate(
      estimateDelivery(order.processingDays ?? (await getStoreProcessingDays()), order.confirmedAt ?? order.createdAt)
    );

  if (order.paymentMethod === "COD" && !cancelled) {
    const estimate = await confirmedEstimate();
    return (
      <main className="order-success-page">
        <div className="success-card">
          <CheckoutSteps current="Confirmed" />
          <div className="success-icon">✓</div>

          <p className="success-label">ORDER CONFIRMED</p>

          <h1>Thank You For Your Order!</h1>

          <p className="success-message">
            Your order is confirmed. Please pay {formatRupees(order.total)} in cash or UPI when it
            is delivered.
          </p>

          {details}

          <p className="delivery-message">
            Expected delivery: <strong>{estimate}</strong>. We will email {order.shippingEmail} when your
            order ships{token ? ", with a link to track it" : ""}.
          </p>

          <div className="success-actions">
            <Link href={detailHref} className="success-btn">
              View Order
            </Link>

            <Link href="/products" className="secondary-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (paid) {
    const estimate = await confirmedEstimate();
    return (
      <main className="order-success-page">
        <div className="success-card">
          <CheckoutSteps current="Confirmed" />
          <div className="success-icon">✓</div>

          <p className="success-label">PAYMENT RECEIVED</p>

          <h1>Thank You For Your Order!</h1>

          <p className="success-message">
            Your payment was successful and your order is confirmed.
          </p>

          {details}

          <p className="delivery-message">
            Expected delivery: <strong>{estimate}</strong>. We will email {order.shippingEmail} when your
            order ships{token ? ", with a link to track it" : ""}.
          </p>

          <div className="success-actions">
            <Link href={detailHref} className="success-btn">
              View Order
            </Link>

            <Link href="/products" className="secondary-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (awaitingPayment) {
    return (
      <main className="order-success-page">
        <div className="success-card">
          <div className="success-icon pending">!</div>

          <p className="success-label">PAYMENT PENDING</p>

          <h1>Complete Your Payment</h1>

          <p className="success-message">
            {payment === "failed"
              ? "Your payment didn't go through. No money was taken for this attempt — please try again."
              : "Your order is reserved, but we haven't received payment yet."}
          </p>

          {details}

          <p className="delivery-message">
            Please pay within {PAYMENT_WINDOW_MINUTES} minutes of placing your order, or it will be
            cancelled automatically and the items released. Payment not working? Choose Cash on
            Delivery and pay {formatRupees(order.total)} in cash or UPI when it arrives.
          </p>

          <div className="success-actions">
            <PayNowButton
              orderId={order.orderId}
              accessToken={token}
              label={payment === "failed" ? `Try Again · ${formatRupees(order.total)}` : `Pay ${formatRupees(order.total)}`}
              className="success-btn"
            />

            <CodFallbackButton orderId={order.orderId} accessToken={token} />
          </div>

          <p className="delivery-message">
            <Link href={detailHref}>View order details</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="order-success-page">
      <div className="success-card">
        <p className="success-label">ORDER CANCELLED</p>

        <h1>This Order Was Cancelled</h1>

        <p className="success-message">
          {order.cancelReason === EXPIRED_REASON || !order.cancelReason
            ? `Payment wasn't completed within ${PAYMENT_WINDOW_MINUTES} minutes, so the order was cancelled and the items released. You have not been charged.`
            : order.cancelReason}
        </p>

        {details}

        <div className="success-actions">
          <Link href="/products" className="success-btn">
            Shop Again
          </Link>

          <Link href={detailHref} className="secondary-btn">
            View Order
          </Link>
        </div>
      </div>
    </main>
  );
}
