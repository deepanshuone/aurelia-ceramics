import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_SIZE, parsePage, requireAdmin } from "../../../lib/admin";
import type { Prisma } from "../../../lib/generated/prisma/client";
import { formatOrderDate, formatRupees } from "../../../lib/order-display";
import { prisma } from "../../../lib/prisma";
import Pagination from "../../../components/admin/Pagination";

export const metadata: Metadata = { title: "Customers" };

type Search = { q?: string; role?: string; page?: string };

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const where: Prisma.CustomerWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(params.role === "ADMIN" ? { role: "ADMIN" } : params.role === "blocked" ? { isActive: false } : {}),
  };

  const total = await prisma.customer.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  // Lifetime value counts paid orders that weren't cancelled or refunded.
  const spend = await prisma.order.groupBy({
    by: ["customerId"],
    where: {
      customerId: { in: customers.map((customer) => customer.id) },
      paymentStatus: "PAID",
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    _sum: { total: true },
  });
  const spendById = new Map(spend.map((row) => [row.customerId, Number(row._sum.total ?? 0)]));

  return (
    <>
      <header className="admin-header">
        <h1>Customers</h1>
        <span className="admin-count">{total} total</span>
      </header>

      <form className="admin-filters" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="Name, email or phone" aria-label="Search customers" />
        <select name="role" defaultValue={params.role ?? ""} aria-label="Filter">
          <option value="">Everyone</option>
          <option value="ADMIN">Admins</option>
          <option value="blocked">Blocked</option>
        </select>
        <button type="submit" className="admin-btn">
          Filter
        </button>
        {(q || params.role) && (
          <Link href="/admin/customers" className="admin-link">
            Clear
          </Link>
        )}
      </form>

      <section className="admin-panel">
        {customers.length === 0 ? (
          <p className="admin-empty">No customers match these filters.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th className="num">Orders</th>
                  <th className="num">Spent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <Link href={`/admin/customers/${customer.id}`}>{customer.name}</Link>
                      <small>{customer.email}</small>
                    </td>
                    <td>{customer.phone}</td>
                    <td>{formatOrderDate(customer.createdAt)}</td>
                    <td className="num">{customer._count.orders}</td>
                    <td className="num">{formatRupees(spendById.get(customer.id) ?? 0)}</td>
                    <td>
                      {customer.role === "ADMIN" && <span className="admin-badge on">Admin</span>}
                      {!customer.isActive && <span className="admin-badge off">Blocked</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination basePath="/admin/customers" params={{ q, role: params.role }} page={page} totalPages={totalPages} />
    </>
  );
}
