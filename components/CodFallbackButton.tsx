"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Shown next to "Pay" on an unpaid online order: confirms it as Cash on
// Delivery instead, keeping the same items and total.
export default function CodFallbackButton({
  orderId,
  className = "secondary-btn",
}: {
  orderId: string;
  className?: string;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSwitching(true);
    setError(null);

    const response = await fetch("/api/payments/cod", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
      cache: "no-store",
    }).catch(() => null);
    const data = await response?.json().catch(() => ({}));

    if (response?.ok) {
      router.replace(`/order-success?orderId=${encodeURIComponent(orderId)}`);
      router.refresh();
      return;
    }

    setSwitching(false);
    setError(data?.error ?? "Could not switch to Cash on Delivery. Please try again.");
    router.refresh();
  }

  return (
    <div className="pay-now">
      <button type="button" className={className} onClick={handleClick} disabled={switching}>
        {switching ? "Confirming…" : "Pay on Delivery Instead"}
      </button>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
