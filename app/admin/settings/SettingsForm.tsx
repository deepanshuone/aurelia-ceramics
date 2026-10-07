"use client";

import { useActionState } from "react";
import FormMessage from "../../../components/admin/FormMessage";
import SubmitButton from "../../../components/admin/SubmitButton";
import { MAX_PROCESSING_DAYS } from "../../../lib/processing";
import { saveSettings } from "./actions";

export default function SettingsForm({ processingDays }: { processingDays: number }) {
  const [state, action] = useActionState(saveSettings, null);

  return (
    <form action={action} className="admin-form">
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
      <SubmitButton>Save settings</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
