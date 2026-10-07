"use client";

import { useActionState } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import type { DeliveryRules } from "../../../lib/cart";
import { MAX_PROCESSING_DAYS } from "../../../lib/processing";
import { saveSettings } from "./actions";

export default function SettingsForm({
  processingDays,
  delivery,
}: {
  processingDays: number;
  delivery: DeliveryRules;
}) {
  const [state, action] = useActionState(saveSettings, null);

  return (
    <form action={action} className="admin-form">
      <h2>Order processing</h2>
      <label className="admin-field">
        <span>Processing time for all orders (days)</span>
        <input
          name="processingDays"
          type="number"
          min={0}
          max={MAX_PROCESSING_DAYS}
          step={1}
          defaultValue={processingDays}
          required
        />
      </label>
      <p className="admin-hint">
        How long an order takes to prepare before it ships, counted from when it is confirmed. Applies to every
        order that doesn&apos;t have its own processing time set on the order page.
      </p>

      <h2>Delivery charges</h2>
      <label className="admin-field">
        <span>Free delivery on orders of (₹)</span>
        <input
          name="freeDeliveryThreshold"
          type="number"
          min={0}
          step={1}
          defaultValue={delivery.freeDeliveryThreshold}
          required
        />
      </label>
      <label className="admin-field">
        <span>Delivery charge below that (₹)</span>
        <input name="deliveryFee" type="number" min={0} step={1} defaultValue={delivery.deliveryFee} required />
      </label>
      <p className="admin-hint">
        Orders whose product total (before any coupon) is below the free delivery amount pay the delivery charge, for
        both online payment and Cash on Delivery. Set the charge to 0 to make all delivery free.
      </p>

      <SubmitButton>Save settings</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
