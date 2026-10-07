"use client";

import { useActionState } from "react";
import FormMessage from "../../../../components/admin/FormMessage";
import SubmitButton from "../../../../components/admin/SubmitButton";
import { updateCustomer } from "../actions";

const ROLE_OPTIONS = [
  { value: "CUSTOMER", label: "Customer — no admin panel access" },
  { value: "VIEWER", label: "Viewer — can see the admin panel, can't change anything" },
  { value: "EDITOR", label: "Editor — orders, products, coupons, enquiries, reviews" },
  { value: "ADMIN", label: "Admin — everything, incl. refunds, settings and roles" },
];

export default function CustomerActions({
  customerId,
  isActive,
  role,
}: {
  customerId: string;
  isActive: boolean;
  role: string;
}) {
  const [state, action] = useActionState(updateCustomer.bind(null, customerId), null);

  return (
    <div className="admin-form">
      <form action={action} className="admin-form">
        <input type="hidden" name="intent" value="role" />
        <label className="admin-field">
          <span>Role</span>
          <select name="role" defaultValue={role}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton className="admin-btn secondary" confirmMessage="Click again to change role" pendingLabel="Saving…">
          Save role
        </SubmitButton>
      </form>

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
      <FormMessage state={state} />
    </div>
  );
}
