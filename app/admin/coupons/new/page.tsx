import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "../../../../lib/admin";
import CouponForm from "../CouponForm";

export const metadata: Metadata = { title: "New coupon" };

export default async function NewCouponPage() {
  await requirePermission("coupons", "edit");

  return (
    <>
      <Link href="/admin/coupons" className="admin-link">
        ← All coupons
      </Link>
      <header className="admin-header">
        <h1>New coupon</h1>
      </header>
      <CouponForm
        values={{
          id: null,
          code: "",
          description: "",
          discountType: "PERCENTAGE",
          discountValue: "",
          minOrderValue: "",
          maxDiscount: "",
          usageLimit: "",
          expiresAt: "",
          isActive: true,
          canDelete: false,
        }}
      />
    </>
  );
}
