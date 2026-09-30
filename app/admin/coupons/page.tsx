import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "../../../lib/admin";
import { formatOrderDate, formatRupees } from "../../../lib/order-display";
import { prisma } from "../../../lib/prisma";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  await requireAdmin();

  const coupons = await prisma.coupon.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] });
  const now = new Date();

  return (
    <>
      <header className="admin-header">
        <h1>Coupons</h1>
        <span className="admin-count">{coupons.length} total</span>
        <Link href="/admin/coupons/new" className="admin-btn">
          + New coupon
        </Link>
      </header>

      <section className="admin-panel">
        {coupons.length === 0 ? (
          <p className="admin-empty">No coupons yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Conditions</th>
                  <th className="num">Used</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const expired = coupon.expiresAt !== null && coupon.expiresAt < now;
                  const exhausted = coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit;
                  const status = !coupon.isActive ? "Off" : expired ? "Expired" : exhausted ? "Used up" : "Live";

                  return (
                    <tr key={coupon.id}>
                      <td>
                        <Link href={`/admin/coupons/${coupon.id}`}>
                          <code>{coupon.code}</code>
                        </Link>
                        {coupon.description && <small>{coupon.description}</small>}
                      </td>
                      <td>
                        {coupon.discountType === "PERCENTAGE"
                          ? `${Number(coupon.discountValue)}%`
                          : formatRupees(coupon.discountValue)}
                        {coupon.maxDiscount && <small>up to {formatRupees(coupon.maxDiscount)}</small>}
                      </td>
                      <td>
                        {coupon.minOrderValue ? `Min ${formatRupees(coupon.minOrderValue)}` : "No minimum"}
                        {coupon.expiresAt && <small>Until {formatOrderDate(coupon.expiresAt)}</small>}
                      </td>
                      <td className="num">
                        {coupon.usedCount}
                        {coupon.usageLimit !== null && ` / ${coupon.usageLimit}`}
                      </td>
                      <td>
                        <span className={`admin-badge ${status === "Live" ? "on" : "off"}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
