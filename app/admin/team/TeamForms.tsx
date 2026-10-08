"use client";

import { useActionState } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import type { AccessLevel, Area, RolePermissions } from "../../../lib/permissions";
import { changeAccess, grantAccess, savePermissions } from "./actions";
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

const LEVEL_OPTIONS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "view", label: "View only" },
  { value: "edit", label: "Can edit" },
];

const REFUND_OPTIONS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "Not allowed" },
  { value: "edit", label: "Allowed" },
];

export function PermissionsForm({
  areas,
  permissions,
}: {
  areas: { area: Area; label: string; detail: string }[];
  permissions: RolePermissions;
}) {
  const [state, action] = useActionState(savePermissions, null);

  return (
    <form action={action} className="admin-form">
      <div className="admin-table-wrap">
        <table className="admin-table perm-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Admin</th>
              <th>Editor</th>
              <th>Viewer</th>
            </tr>
          </thead>
          <tbody>
            {areas.map(({ area, label, detail }) => (
              <tr key={area}>
                <td>
                  {label}
                  <small>{detail}</small>
                </td>
                <td>
                  <span className="perm full">Can edit</span>
                </td>
                {(["EDITOR", "VIEWER"] as const).map((role) => (
                  <td key={role}>
                    <select
                      name={`${role}.${area}`}
                      defaultValue={permissions[role][area]}
                      className="perm-select"
                      aria-label={`${label} for ${role === "EDITOR" ? "Editors" : "Viewers"}`}
                    >
                      {(area === "refunds" ? REFUND_OPTIONS : LEVEL_OPTIONS).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td>
                Team & Access
                <small>Give or remove admin access, change these permissions</small>
              </td>
              <td>
                <span className="perm full">Can edit</span>
              </td>
              <td>
                <span className="perm none">Admins only</span>
              </td>
              <td>
                <span className="perm none">Admins only</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="perm-actions">
        <SubmitButton pendingLabel="Saving…">Save permissions</SubmitButton>
        <SubmitButton
          className="admin-btn secondary"
          name="intent"
          value="reset"
          confirmMessage="Click again to reset"
          pendingLabel="Resetting…"
        >
          Reset to defaults
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
