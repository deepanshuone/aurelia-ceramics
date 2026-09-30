"use client";

import { useActionState } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import { deleteCoupon, saveCoupon } from "./actions";

export type CouponFormValues = {
  id: string | null;
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderValue: string;
  maxDiscount: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
  canDelete: boolean;
};

export default function CouponForm({ values }: { values: CouponFormValues }) {
  const [state, action] = useActionState(saveCoupon.bind(null, values.id), null);
  const [deleteState, deleteAction] = useActionState(deleteCoupon.bind(null, values.id ?? ""), null);

  return (
    <>
      <form action={action} className="admin-form admin-panel">
        <div className="admin-field-row">
          <label className="admin-field">
            <span>Code *</span>
            <input name="code" defaultValue={values.code} required maxLength={40} className="uppercase" />
          </label>
          <label className="admin-field grow">
            <span>Description (shown at checkout)</span>
            <input name="description" defaultValue={values.description} maxLength={200} placeholder="10% off your first order" />
          </label>
        </div>

        <div className="admin-field-row">
          <label className="admin-field">
            <span>Type *</span>
            <select name="discountType" defaultValue={values.discountType}>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed amount (₹)</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Discount *</span>
            <input name="discountValue" type="number" step="0.01" min="0.01" defaultValue={values.discountValue} required />
          </label>
          <label className="admin-field">
            <span>Max discount (₹)</span>
            <input name="maxDiscount" type="number" step="0.01" min="0" defaultValue={values.maxDiscount} placeholder="No cap" />
          </label>
        </div>

        <div className="admin-field-row">
          <label className="admin-field">
            <span>Minimum order (₹)</span>
            <input name="minOrderValue" type="number" step="0.01" min="0" defaultValue={values.minOrderValue} placeholder="None" />
          </label>
          <label className="admin-field">
            <span>Usage limit</span>
            <input name="usageLimit" type="number" step="1" min="1" defaultValue={values.usageLimit} placeholder="Unlimited" />
          </label>
          <label className="admin-field">
            <span>Expires on</span>
            <input name="expiresAt" type="date" defaultValue={values.expiresAt} />
          </label>
        </div>

        <div className="admin-checks">
          <label>
            <input type="checkbox" name="isActive" defaultChecked={values.isActive} /> Active
          </label>
        </div>

        <FormMessage state={state} />
        <SubmitButton>{values.id ? "Save changes" : "Create coupon"}</SubmitButton>
      </form>

      {values.id && values.canDelete && (
        <form action={deleteAction} className="admin-panel admin-danger-zone">
          <h2>Delete coupon</h2>
          <p className="admin-hint">This coupon hasn&apos;t been used on any order, so it can be deleted.</p>
          <FormMessage state={deleteState} />
          <SubmitButton className="admin-btn danger" confirmMessage="Click again to delete" pendingLabel="Deleting…">
            Delete coupon
          </SubmitButton>
        </form>
      )}
    </>
  );
}
