import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "../../lib/admin";
import { prisma } from "../../lib/prisma";
import {
  ORDER_STATUS_LABELS,
  paymentLabel,
  formatOrderDate,
  formatRupees,
} from "../../lib/order-display";

export const metadata: Metadata = { title: "Dashboard" };

const LOW_STOCK = 5;

export default async function AdminDashboard() {
  await requireStaff();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [revenue, ordersToday, toFulfil, refundPending, lowStock, customers, recent, newEnquiries] =
    await Promise.all([
      prisma.order.aggregate({
        where: { paymentStatus: "PAID", status: { notIn: ["CANCELLED", "REFUNDED"] }, createdAt: { gte: thirtyDaysAgo } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING"] } } }),
      prisma.order.findMany({
        where: { status: "CANCELLED", paymentStatus: "PAID" },
        select: { orderId: true, total: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 10,
      }),
      prisma.product.findMany({
        where: { isActive: true, stock: { lte: LOW_STOCK } },
        select: { id: true, name: true, stock: true },
        orderBy: { stock: "asc" },
        take: 10,
      }),
      prisma.customer.count({ where: { role: "CUSTOMER" } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          orderId: true,
          createdAt: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          total: true,
          shippingName: true,
        },
      }),
      prisma.enquiry.count({ where: { status: "NEW" } }),
    ]);

  const stats = [
    { label: "Revenue (30 days)", value: formatRupees(revenue._sum.total ?? 0), note: `${revenue._count} paid orders` },
    { label: "Orders today", value: String(ordersToday) },
    { label: "To fulfil", value: String(toFulfil), href: "/admin/orders?status=CONFIRMED" },
    { label: "Customers", value: String(customers), href: "/admin/customers" },
    { label: "New enquiries", value: String(newEnquiries), href: "/admin/enquiries?status=NEW" },
  ];

  return (
    <>
      <header className="admin-header">
        <h1>Dashboard</h1>
      </header>

      <div className="admin-stats">
        {stats.map((stat) => {
          const body = (
            <>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              {stat.note && <small>{stat.note}</small>}
            </>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="admin-stat">
              {body}
            </Link>
          ) : (
            <div key={stat.label} className="admin-stat">
              {body}
            </div>
          );
        })}
      </div>

      {refundPending.length > 0 && (
        <section className="admin-panel admin-alert">
          <h2>Refunds needed ({refundPending.length})</h2>
          <p>These orders were cancelled after the customer paid. Issue a refund from each order page.</p>
          <ul className="admin-list">
            {refundPending.map((order) => (
              <li key={order.orderId}>
                <Link href={`/admin/orders/${order.orderId}`}>{order.orderId}</Link>
                <span>{formatRupees(order.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="admin-columns">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Recent orders</h2>
            <Link href="/admin/orders">View all →</Link>
          </div>

          {recent.length === 0 ? (
            <p className="admin-empty">No orders yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((order) => (
                    <tr key={order.orderId}>
                      <td>
                        <Link href={`/admin/orders/${order.orderId}`}>{order.orderId}</Link>
                        <small>{formatOrderDate(order.createdAt)}</small>
                      </td>
                      <td>{order.shippingName}</td>
                      <td>
                        <span className={`admin-badge status-${order.status.toLowerCase()}`}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                        <small>{paymentLabel(order.paymentMethod, order.paymentStatus)}</small>
                      </td>
                      <td className="num">{formatRupees(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Low stock</h2>
            <Link href="/admin/products?stock=low">View all →</Link>
          </div>

          {lowStock.length === 0 ? (
            <p className="admin-empty">All products have more than {LOW_STOCK} in stock.</p>
          ) : (
            <ul className="admin-list">
              {lowStock.map((product) => (
                <li key={product.id}>
                  <Link href={`/admin/products/${product.id}`}>{product.name}</Link>
                  <span className={product.stock === 0 ? "text-danger" : undefined}>
                    {product.stock === 0 ? "Out of stock" : `${product.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
