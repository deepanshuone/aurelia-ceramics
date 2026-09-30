"use client";

import { useActionState } from "react";
import SubmitButton from "../../../components/admin/SubmitButton";
import { deleteProduct } from "./actions";

/** Compact two-click delete for a row in the products table. */
export default function DeleteProductButton({ productId }: { productId: string }) {
  const [state, action] = useActionState(deleteProduct.bind(null, productId), null);

  return (
    <form action={action} className="admin-row-action">
      <SubmitButton className="admin-btn danger small" confirmMessage="Confirm delete" pendingLabel="Deleting…">
        Delete
      </SubmitButton>
      {state?.error && <small className="text-danger">{state.error}</small>}
    </form>
  );
}
