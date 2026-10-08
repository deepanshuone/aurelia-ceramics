import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../../lib/admin";
import { prisma } from "../../../../lib/prisma";
import CouponForm from "../CouponForm";

export const metadata: Metadata = { title: "Edit coupon" };

/** YYYY-MM-DD in India time, for the date input. */
function toDateInput(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

export default async function EditCouponPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requirePermission("coupons", "view");
  const { id } = await params;
  const { created } = await searchParams;

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!coupon) notFound();

  return (
    <>
      <Link href="/admin/coupons" className="admin-link">
        ← All coupons
      </Link>
      <header className="admin-header">
        <h1>
          <code>{coupon.code}</code>
        </h1>
        <span className="admin-count">
          Used {coupon.usedCount}
          {coupon.usageLimit !== null && ` of ${coupon.usageLimit}`} times
        </span>
      </header>

      {created && <p className="admin-success">Coupon created.</p>}

      <CouponForm
        values={{
          id: coupon.id,
          code: coupon.code,
          description: coupon.description ?? "",
          discountType: coupon.discountType,
          discountValue: String(coupon.discountValue),
          minOrderValue: coupon.minOrderValue ? String(coupon.minOrderValue) : "",
          maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : "",
          usageLimit: coupon.usageLimit !== null ? String(coupon.usageLimit) : "",
          expiresAt: coupon.expiresAt ? toDateInput(coupon.expiresAt) : "",
          isActive: coupon.isActive,
          canDelete: coupon._count.orders === 0,
        }}
      />
    </>
  );
}
