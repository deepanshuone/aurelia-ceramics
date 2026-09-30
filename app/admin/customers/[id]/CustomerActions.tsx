"use client";

import { useActionState } from "react";
import FormMessage from "../../../../components/admin/FormMessage";
import SubmitButton from "../../../../components/admin/SubmitButton";
import { updateCustomer } from "../actions";

export default function CustomerActions({
  customerId,
  isActive,
  isAdmin,
}: {
  customerId: string;
  isActive: boolean;
  isAdmin: boolean;
}) {
  const [state, action] = useActionState(updateCustomer.bind(null, customerId), null);

  return (
    <div className="admin-form">
      <div className="admin-button-row">
        <form action={action}>
          <input type="hidden" name="intent" value={isActive ? "block" : "unblock"} />
          <SubmitButton
            className={isActive ? "admin-btn danger" : "admin-btn"}
            confirmMessage={isActive ? "Click again to block" : undefined}
            pendingLabel="Saving…"
          >
            {isActive ? "Block account" : "Unblock account"}
          </SubmitButton>
        </form>

        <form action={action}>
          <input type="hidden" name="intent" value={isAdmin ? "make-customer" : "make-admin"} />
          <SubmitButton
            className="admin-btn secondary"
            confirmMessage={isAdmin ? "Click again to remove admin" : "Click again to make admin"}
            pendingLabel="Saving…"
          >
            {isAdmin ? "Remove admin access" : "Make admin"}
          </SubmitButton>
        </form>
      </div>
      <FormMessage state={state} />
    </div>
  );
}
