"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRazorpayPayment } from "./useRazorpayPayment";

export default function PayNowButton({
  orderId,
  label = "Pay Now",
  className = "primary-btn",
}: {
  orderId: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const { pay, paying } = useRazorpayPayment();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    const outcome = await pay(orderId);

    if (outcome.status === "paid") {
      router.push(`/order-success?orderId=${encodeURIComponent(outcome.orderId)}`);
      router.refresh();
    } else if (outcome.status === "error") {
      setError(outcome.message);
      router.refresh();
    }
  }

  return (
    <div className="pay-now">
      <button type="button" className={className} onClick={handleClick} disabled={paying}>
        {paying ? "Opening payment…" : label}
      </button>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
