"use client";

import { useActionState } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import { deleteEnquiry, updateEnquiry } from "./actions";

export default function EnquiryActions({
  enquiryId,
  status,
  adminNote,
}: {
  enquiryId: string;
  status: "NEW" | "IN_PROGRESS" | "CLOSED";
  adminNote: string;
}) {
  const [state, action] = useActionState(updateEnquiry.bind(null, enquiryId), null);
  const [deleteState, deleteAction] = useActionState(deleteEnquiry.bind(null, enquiryId), null);

  return (
    <div className="admin-enquiry-actions">
      <form action={action} className="admin-form">
        <div className="admin-field-row">
          <label className="admin-field">
            <span>Status</span>
            <select name="status" defaultValue={status}>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
          <label className="admin-field grow">
            <span>Internal note (not shown to the customer)</span>
            <input name="adminNote" defaultValue={adminNote} maxLength={1000} placeholder="e.g. Sent quote on WhatsApp" />
          </label>
        </div>
        <FormMessage state={state} />
        <SubmitButton className="admin-btn small">Save</SubmitButton>
      </form>

      <form action={deleteAction} className="admin-row-action">
        <SubmitButton className="admin-btn danger small" confirmMessage="Confirm delete" pendingLabel="Deleting…">
          Delete
        </SubmitButton>
        <FormMessage state={deleteState} />
      </form>
    </div>
  );
}
