"use client";

import { useActionState } from "react";
import FormMessage from "../../../../components/admin/FormMessage";
import SubmitButton from "../../../../components/admin/SubmitButton";
import { cancelOrder, refundOrder, updateOrderStatus, updateTracking } from "../actions";

export function StatusForm({ orderRowId, options }: { orderRowId: string; options: { value: string; label: string }[] }) {
  const [state, action] = useActionState(updateOrderStatus.bind(null, orderRowId), null);

  return (
    <form action={action} className="admin-form-inline">
      <select name="status" defaultValue={options[0]?.value} aria-label="New status">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <SubmitButton>Update status</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function TrackingForm({
  orderRowId,
  carrier,
  number,
}: {
  orderRowId: string;
  carrier: string | null;
  number: string | null;
}) {
  const [state, action] = useActionState(updateTracking.bind(null, orderRowId), null);

  return (
    <form action={action} className="admin-form">
      <div className="admin-field-row">
        <label className="admin-field">
          <span>Carrier</span>
          <input name="trackingCarrier" defaultValue={carrier ?? ""} placeholder="e.g. Delhivery" />
        </label>
        <label className="admin-field">
          <span>Tracking number</span>
          <input name="trackingNumber" defaultValue={number ?? ""} />
        </label>
      </div>
      <SubmitButton>Save tracking</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CancelForm({ orderRowId, paid }: { orderRowId: string; paid: boolean }) {
  const [state, action] = useActionState(cancelOrder.bind(null, orderRowId), null);

  return (
    <form action={action} className="admin-form">
      <label className="admin-field">
        <span>Reason (shown to the customer)</span>
        <input name="reason" required minLength={3} maxLength={300} placeholder="e.g. Item damaged in warehouse" />
      </label>
      <p className="admin-hint">
        Stock and coupon usage are released.{paid && " The customer has paid, so refund them after cancelling."}
      </p>
      <SubmitButton className="admin-btn danger" confirmMessage="Click again to cancel order" pendingLabel="Cancelling…">
        Cancel order
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function RefundForm({
  orderRowId,
  remaining,
  canUseRazorpay,
  fullRefundAllowed,
}: {
  orderRowId: string;
  remaining: number;
  canUseRazorpay: boolean;
  fullRefundAllowed: boolean;
}) {
  const [state, action] = useActionState(refundOrder.bind(null, orderRowId), null);

  return (
    <form action={action} className="admin-form">
      <label className="admin-field">
        <span>Amount (₹) — up to ₹{remaining.toLocaleString("en-IN")}</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={remaining}
          defaultValue={fullRefundAllowed ? remaining : undefined}
          required
        />
      </label>

      <fieldset className="admin-radio-group">
        <legend>Method</legend>
        <label>
          <input type="radio" name="method" value="razorpay" defaultChecked={canUseRazorpay} disabled={!canUseRazorpay} />
          Refund via Razorpay
        </label>
        <label>
          <input type="radio" name="method" value="manual" defaultChecked={!canUseRazorpay} />
          Already refunded outside Razorpay (record only)
        </label>
      </fieldset>

      {!fullRefundAllowed && (
        <p className="admin-hint">Partial refunds only while the order is active. Cancel it first for a full refund.</p>
      )}

      <SubmitButton className="admin-btn danger" confirmMessage="Click again to refund" pendingLabel="Refunding…">
        Issue refund
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
