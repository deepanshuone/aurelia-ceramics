"use client";

import { useActionState } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import { changeAccess, grantAccess } from "./actions";
import EmailSuggest from "./EmailSuggest";

const LEVELS = [
  { value: "VIEWER", label: "Viewer" },
  { value: "EDITOR", label: "Editor" },
  { value: "ADMIN", label: "Admin" },
];

export function GrantAccessForm() {
  const [state, action] = useActionState(grantAccess, null);

  return (
    <form action={action} className="admin-form team-grant">
      <div className="admin-field-row">
        <label className="admin-field grow">
          <span>Account email</span>
          <EmailSuggest />
        </label>
        <label className="admin-field">
          <span>Access level</span>
          <select name="role" defaultValue="VIEWER">
            {LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </label>
        <div className="team-grant-submit">
          <SubmitButton pendingLabel="Adding…">Give access</SubmitButton>
        </div>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function MemberAccessForm({ customerId, role }: { customerId: string; role: string }) {
  const [state, action] = useActionState(changeAccess.bind(null, customerId), null);

  return (
    <div className="team-member-actions">
      <form action={action} className="admin-form-inline">
        <select name="role" defaultValue={role} aria-label="Access level">
          {LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
          <option value="CUSTOMER">Customer (no admin access)</option>
        </select>
        <SubmitButton className="admin-btn small" pendingLabel="Saving…">
          Update
        </SubmitButton>
      </form>
      <form action={action}>
        <input type="hidden" name="role" value="CUSTOMER" />
        <SubmitButton
          className="admin-btn small danger"
          confirmMessage="Click again: make Customer"
          pendingLabel="Removing…"
        >
          Remove access (make Customer)
        </SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}
