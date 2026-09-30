import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/admin";
import {
  CANCELLABLE_STATUSES,
  NEXT_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  paymentLabel,
  formatOrderDate,
  formatRupees,
} from "../../../../lib/order-display";
import { prisma } from "../../../../lib/prisma";
import { CancelForm, RefundForm, StatusForm, TrackingForm } from "./OrderActions";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requireAdmin();
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { orderId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      coupon: { select: { code: true } },
      payment: true,
      items: {
        orderBy: { createdAt: "asc" },
        include: { product: { select: { id: true } } },
      },
    },
  });

  if (!order) notFound();

  const total = Number(order.total);
  const refunded = Number(order.refundedAmount);
  const remaining = Math.round((total - refunded) * 100) / 100;
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];
  const cancellable = CANCELLABLE_STATUSES.includes(order.status);
  const refundable = order.paymentStatus === "PAID" && remaining > 0;

  return (
    <>
      <Link href="/admin/orders" className="admin-link">← All orders</Link>

      <header className="admin-header">
        <h1>{order.orderId}</h1>
        <span className={`admin-badge status-${order.status.toLowerCase()}`}>{ORDER_STATUS_LABELS[order.status]}</span>
        <span className={`admin-badge payment-${order.paymentStatus.toLowerCase()}`}>
          {paymentLabel(order.paymentMethod, order.paymentStatus)}
        </span>
      </header>
      <p className="admin-subtitle">Placed {formatOrderDate(order.createdAt)} at {order.createdAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}</p>

      {order.status === "CANCELLED" && order.paymentStatus === "PAID" && (
        <div className="admin-panel admin-alert">
          <strong>Refund needed.</strong> This order was cancelled but the customer paid {formatRupees(total)}.
        </div>
      )}

      <div className="admin-columns wide-left">
        <div>
          <section className="admin-panel">
            <h2>Items</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Price</th>
                    <th className="num">Qty</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.product ? (
                          <Link href={`/admin/products/${item.product.id}`}>{item.name}</Link>
                        ) : (
                          <>
                            {item.name}
                            <small>Product deleted</small>
                          </>
                        )}
                      </td>
                      <td className="num">{formatRupees(item.price)}</td>
                      <td className="num">{item.quantity}</td>
                      <td className="num">{formatRupees(Number(item.price) * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Subtotal</td>
                    <td className="num">{formatRupees(order.subtotal)}</td>
                  </tr>
                  {Number(order.discount) > 0 && (
                    <tr>
                      <td colSpan={3}>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</td>
                      <td className="num">−{formatRupees(order.discount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3}>Delivery</td>
                    <td className="num">{Number(order.delivery) === 0 ? "Free" : formatRupees(order.delivery)}</td>
                  </tr>
                  <tr className="total">
                    <td colSpan={3}>Total</td>
                    <td className="num">{formatRupees(total)}</td>
                  </tr>
                  {refunded > 0 && (
                    <tr>
                      <td colSpan={3}>Refunded</td>
                      <td className="num">−{formatRupees(refunded)}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </section>

          {nextStatuses.length > 0 && (
            <section className="admin-panel">
              <h2>Fulfilment</h2>
              <StatusForm
                orderRowId={order.id}
                options={nextStatuses.map((value) => ({ value, label: ORDER_STATUS_LABELS[value] }))}
              />
            </section>
          )}

          {order.status === "PENDING" && (
            <section className="admin-panel">
              <h2>Fulfilment</h2>
              <p className="admin-hint">
                Waiting for payment. The order confirms automatically when the customer pays, or is cancelled
                automatically if they don&apos;t pay within 30 minutes.
              </p>
            </section>
          )}

          <section className="admin-panel">
            <h2>Tracking</h2>
            <TrackingForm orderRowId={order.id} carrier={order.trackingCarrier} number={order.trackingNumber} />
          </section>

          {refundable && (
            <section className="admin-panel">
              <h2>Refund</h2>
              <RefundForm
                orderRowId={order.id}
                remaining={remaining}
                canUseRazorpay={!!order.payment?.razorpayPaymentId}
                fullRefundAllowed={order.status === "CANCELLED" || order.status === "DELIVERED"}
              />
            </section>
          )}

          {cancellable && (
            <section className="admin-panel">
              <h2>Cancel order</h2>
              <CancelForm orderRowId={order.id} paid={order.paymentStatus === "PAID"} />
            </section>
          )}
        </div>

        <div>
          <section className="admin-panel">
            <h2>Customer</h2>
            <p className="admin-detail">
              <Link href={`/admin/customers/${order.customer.id}`}>{order.customer.name}</Link>
              <br />
              {order.customer.email}
            </p>
          </section>

          <section className="admin-panel">
            <h2>Ship to</h2>
            <p className="admin-detail">
              {order.shippingName}
              <br />
              {order.shippingAddress}
              <br />
              {order.shippingCity}, {order.shippingState} – {order.shippingPin}
              <br />
              {order.shippingPhone}
              <br />
              {order.shippingEmail}
            </p>
          </section>

          <section className="admin-panel">
            <h2>Payment</h2>
            {order.payment ? (
              <dl className="admin-dl">
                <dt>Status</dt>
                <dd>{PAYMENT_STATUS_LABELS[order.payment.status]}</dd>
                <dt>Razorpay order</dt>
                <dd><code>{order.payment.razorpayOrderId}</code></dd>
                {order.payment.razorpayPaymentId && (
                  <>
                    <dt>Payment ID</dt>
                    <dd><code>{order.payment.razorpayPaymentId}</code></dd>
                  </>
                )}
                {order.payment.failureReason && (
                  <>
                    <dt>Note</dt>
                    <dd className="text-danger">{order.payment.failureReason}</dd>
                  </>
                )}
              </dl>
            ) : (
              <p className="admin-hint">
                {order.paymentMethod === "COD"
                  ? order.paymentStatus === "PAID"
                    ? "Cash on Delivery — collected."
                    : "Cash on Delivery — marked paid automatically when you set the order to Delivered."
                  : "No payment attempt yet."}
              </p>
            )}
          </section>

          {order.cancelReason && (
            <section className="admin-panel">
              <h2>Cancellation</h2>
              <p className="admin-detail">{order.cancelReason}</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
