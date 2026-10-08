"use client";

import { useActionState, useState } from "react";
import SubmitButton from "../../../components/admin/SubmitButton";
import { discountPercent } from "../../../lib/pricing";
import { formatRupees } from "../../../lib/order-display";
import { updateProductPrice } from "./actions";

/** Products-table price cell: shows selling price, MRP and discount, with an inline editor. */
export default function QuickPriceEdit({
  productId,
  price,
  mrp,
  canEdit,
}: {
  productId: string;
  price: number;
  mrp: number | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof updateProductPrice>>, formData: FormData) => {
    const result = await updateProductPrice(productId, prev, formData);
    if (result?.success) setEditing(false);
    return result;
  }, null);
  const off = discountPercent({ price, mrp });

  if (!editing) {
    return (
      <div className="admin-price-cell">
        <strong>{formatRupees(price)}</strong>
        {off > 0 && mrp && (
          <small>
            <s>{formatRupees(mrp)}</s> · {off}% off
          </small>
        )}
        {canEdit && (
          <button type="button" className="admin-link small" onClick={() => setEditing(true)}>
            Edit price
          </button>
        )}
        {state?.success && <small className="admin-price-saved">Saved</small>}
      </div>
    );
  }

  return (
    <form action={action} className="admin-price-edit">
      <label>
        <span>MRP</span>
        <input name="mrp" type="number" step="0.01" min="0" defaultValue={mrp ?? ""} placeholder="—" />
      </label>
      <label>
        <span>Selling</span>
        <input name="price" type="number" step="0.01" min="0.01" defaultValue={price} required />
      </label>
      <div>
        <SubmitButton className="admin-btn small" pendingLabel="Saving…">
          Save
        </SubmitButton>{" "}
        <button type="button" className="admin-btn secondary small" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
      {state?.error && <small className="text-danger">{state.error}</small>}
    </form>
  );
}
