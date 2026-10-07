import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROLE_LABELS, isOwnerEmail, isStaffRole, requirePermission } from "../../../../lib/admin";
import {
  ORDER_STATUS_LABELS,
  paymentLabel,
  formatOrderDate,
  formatRupees,
} from "../../../../lib/order-display";
import { prisma } from "../../../../lib/prisma";
import CustomerActions from "./CustomerActions";

export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("customers", "view");
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { orderId: true, createdAt: true, status: true, paymentStatus: true, paymentMethod: true, total: true },
      },
      _count: { select: { orders: true } },
    },
  });
  if (!customer) notFound();

  const spent = customer.orders
    .filter((order) => order.paymentStatus === "PAID" && order.status !== "CANCELLED" && order.status !== "REFUNDED")
    .reduce((sum, order) => sum + Number(order.total), 0);

  return (
    <>
      <Link href="/admin/customers" className="admin-link">
        ← All customers
      </Link>
      <header className="admin-header">
        <h1>{customer.name}</h1>
        {isOwnerEmail(customer.email) ? (
          <span className="admin-badge on">Owner</span>
        ) : (
          isStaffRole(customer.role) && <span className="admin-badge on">{ROLE_LABELS[customer.role]}</span>
        )}
        {!customer.isActive && <span className="admin-badge off">Blocked</span>}
      </header>

      <div className="admin-columns wide-left">
        <section className="admin-panel">
          <h2>Orders ({customer._count.orders})</h2>
          {customer.orders.length === 0 ? (
            <p className="admin-empty">No orders yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Status</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.orderId}>
                      <td>
                        <Link href={`/admin/orders/${order.orderId}`}>{order.orderId}</Link>
                        <small>{formatOrderDate(order.createdAt)}</small>
                      </td>
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

        <div>
          <section className="admin-panel">
            <h2>Details</h2>
            <dl className="admin-dl">
              <dt>Email</dt>
              <dd>{customer.email}</dd>
              <dt>Phone</dt>
              <dd>{customer.phone}</dd>
              <dt>Joined</dt>
              <dd>{formatOrderDate(customer.createdAt)}</dd>
              <dt>Last login</dt>
              <dd>{customer.lastLoginAt ? formatOrderDate(customer.lastLoginAt) : "—"}</dd>
              <dt>Lifetime spend</dt>
              <dd>{formatRupees(spent)}</dd>
            </dl>
          </section>

          <section className="admin-panel">
            <h2>Addresses</h2>
            {customer.addresses.length === 0 ? (
              <p className="admin-hint">No saved addresses.</p>
            ) : (
              customer.addresses.map((address) => (
                <p key={address.id} className="admin-detail">
                  {address.label && <strong>{address.label}: </strong>}
                  {address.address}, {address.city}, {address.state} – {address.pin}
                  {address.isDefault && <small> (default)</small>}
                </p>
              ))
            )}
          </section>

          <section className="admin-panel">
            <h2>Account</h2>
            {admin.access.customers !== "edit" ||
            (admin.role !== "ADMIN" && customer.role !== "CUSTOMER") ? (
              <p className="admin-hint">
                Role: {ROLE_LABELS[customer.role]}.{" "}
                {admin.access.customers === "edit"
                  ? "Only admins can change roles or block staff accounts."
                  : "You can't change roles or block accounts."}
              </p>
            ) : customer.id === admin.id ? (
              <p className="admin-hint">This is your account. Another admin must change your role or status.</p>
            ) : isOwnerEmail(customer.email) ? (
              <p className="admin-hint">This is the store owner&apos;s account. Its role and status can&apos;t be changed.</p>
            ) : (
              <CustomerActions
                customerId={customer.id}
                isActive={customer.isActive}
                role={customer.role}
                canChangeRole={admin.role === "ADMIN"}
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
