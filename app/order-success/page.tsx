import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { prisma } from "../../lib/prisma";
import PayNowButton from "../../components/PayNowButton";
import { formatOrderDate, formatRupees } from "../../lib/order-display";
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
  searchParams: Promise<{ orderId?: string; payment?: string }>;
}) {
  const { orderId, payment } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/orders");
  }

  await expireStaleOrders(session.user.id);

  // Scoped to the logged-in customer so order IDs can't be used to peek at
  // someone else's order.
  const order = orderId
    ? await prisma.order.findFirst({
        where: { orderId, customerId: session.user.id },
        select: {
          orderId: true,
          total: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          createdAt: true,
          shippingEmail: true,
          cancelReason: true,
        },
      })
    : null;

  if (!order) {
    return (
      <main className="order-success-page">
        <div className="success-card">
          <h1>No Order Found</h1>
          <p>We could not find this order on your account.</p>

          <Link href="/products" className="success-btn">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

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

  if (order.paymentMethod === "COD" && !cancelled) {
    return (
      <main className="order-success-page">
        <div className="success-card">
          <div className="success-icon">✓</div>

          <p className="success-label">ORDER CONFIRMED</p>

          <h1>Thank You For Your Order!</h1>

          <p className="success-message">
            Your order is confirmed. Please pay {formatRupees(order.total)} in cash or UPI when it
            is delivered.
          </p>

          {details}

          <p className="delivery-message">
            We will email {order.shippingEmail} when your order ships.
          </p>

          <div className="success-actions">
            <Link href={`/account/orders/${order.orderId}`} className="success-btn">
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
    return (
      <main className="order-success-page">
        <div className="success-card">
          <div className="success-icon">✓</div>

          <p className="success-label">PAYMENT RECEIVED</p>

          <h1>Thank You For Your Order!</h1>

          <p className="success-message">
            Your payment was successful and your order is confirmed.
          </p>

          {details}

          <p className="delivery-message">
            We will email {order.shippingEmail} when your order ships.
          </p>

          <div className="success-actions">
            <Link href={`/account/orders/${order.orderId}`} className="success-btn">
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
            cancelled automatically and the items released.
          </p>

          <div className="success-actions">
            <PayNowButton
              orderId={order.orderId}
              label={`Pay ${formatRupees(order.total)}`}
              className="success-btn"
            />

            <Link href={`/account/orders/${order.orderId}`} className="secondary-btn">
              View Order
            </Link>
          </div>
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

          <Link href={`/account/orders/${order.orderId}`} className="secondary-btn">
            View Order
          </Link>
        </div>
      </div>
    </main>
  );
}
