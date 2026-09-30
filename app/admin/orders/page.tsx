import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_SIZE, parsePage, requireAdmin } from "../../../lib/admin";
import type { Prisma } from "../../../lib/generated/prisma/client";
import { OrderStatus, PaymentStatus } from "../../../lib/generated/prisma/enums";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  paymentLabel,
  formatOrderDate,
  formatRupees,
} from "../../../lib/order-display";
import { prisma } from "../../../lib/prisma";
import Pagination from "../../../components/admin/Pagination";

export const metadata: Metadata = { title: "Orders" };

type Search = { q?: string; status?: string; payment?: string; page?: string };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const status = Object.values(OrderStatus).find((value) => value === params.status);
  const payment = Object.values(PaymentStatus).find((value) => value === params.payment);
  // "refund" is a virtual filter: cancelled orders that were paid.
  const refundOnly = params.status === "refund";

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(refundOnly ? { status: "CANCELLED", paymentStatus: "PAID" } : {}),
    ...(q
      ? {
          OR: [
            { orderId: { contains: q, mode: "insensitive" } },
            { shippingName: { contains: q, mode: "insensitive" } },
            { shippingEmail: { contains: q, mode: "insensitive" } },
            { shippingPhone: { contains: q } },
          ],
        }
      : {}),
  };

  const total = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);

  const orders = await prisma.order.findMany({
    where,
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
      shippingName: true,
      shippingEmail: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <>
      <header className="admin-header">
        <h1>Orders</h1>
        <span className="admin-count">{total} total</span>
      </header>

      <form className="admin-filters" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="Order ID, name, email or phone" aria-label="Search orders" />

        <select name="status" defaultValue={params.status ?? ""} aria-label="Order status">
          <option value="">All statuses</option>
          {Object.values(OrderStatus).map((value) => (
            <option key={value} value={value}>
              {ORDER_STATUS_LABELS[value]}
            </option>
          ))}
          <option value="refund">Refund needed</option>
        </select>

        <select name="payment" defaultValue={params.payment ?? ""} aria-label="Payment status">
          <option value="">All payments</option>
          {Object.values(PaymentStatus).map((value) => (
            <option key={value} value={value}>
              {PAYMENT_STATUS_LABELS[value]}
            </option>
          ))}
        </select>

        <button type="submit" className="admin-btn">Filter</button>
        {(q || params.status || params.payment) && (
          <Link href="/admin/orders" className="admin-link">Clear</Link>
        )}
      </form>

      <section className="admin-panel">
        {orders.length === 0 ? (
          <p className="admin-empty">No orders match these filters.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.orderId}>
                    <td>
                      <Link href={`/admin/orders/${order.orderId}`}>{order.orderId}</Link>
                      <small>{formatOrderDate(order.createdAt)}</small>
                    </td>
                    <td>
                      {order.shippingName}
                      <small>{order.shippingEmail}</small>
                    </td>
                    <td>{order._count.items}</td>
                    <td>
                      <span className={`admin-badge status-${order.status.toLowerCase()}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge payment-${order.paymentStatus.toLowerCase()}`}>
                        {paymentLabel(order.paymentMethod, order.paymentStatus)}
                      </span>
                      {order.status === "CANCELLED" && order.paymentStatus === "PAID" && (
                        <small className="text-danger">Refund needed</small>
                      )}
                    </td>
                    <td className="num">{formatRupees(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination
        basePath="/admin/orders"
        params={{ q, status: params.status, payment: params.payment }}
        page={page}
        totalPages={totalPages}
      />
    </>
  );
}
