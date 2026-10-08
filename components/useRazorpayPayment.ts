"use client";

import { useCallback, useState } from "react";

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type StartResponse = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  orderId: string;
  prefill: RazorpayOptions["prefill"];
};

export type PaymentOutcome =
  | { status: "paid"; orderId: string }
  | { status: "dismissed" }
  | { status: "error"; message: string };

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("Could not load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}

/**
 * Opens Razorpay Checkout for an existing order and resolves once the payment
 * is verified by our server, the customer closes the window, or it fails.
 */
export function useRazorpayPayment() {
  const [paying, setPaying] = useState(false);

  // `accessToken` is the signed link's token for guest orders (no login).
  const pay = useCallback(async (orderId: string, accessToken?: string): Promise<PaymentOutcome> => {
    setPaying(true);
    try {
      const [params] = await Promise.all([
        postJson<StartResponse>("/api/payments/razorpay/order", { orderId, token: accessToken }),
        loadCheckoutScript(),
      ]);

      if (!window.Razorpay) throw new Error("Could not load the payment window.");
      const Razorpay = window.Razorpay;

      return await new Promise<PaymentOutcome>((resolve) => {
        let lastFailure: string | null = null;

        const checkout = new Razorpay({
          key: params.keyId,
          order_id: params.razorpayOrderId,
          amount: params.amount,
          currency: params.currency,
          name: "Aurelia Ceramics",
          description: `Order ${params.orderId}`,
          prefill: params.prefill,
          theme: { color: "#171614" },
          handler: (response) => {
            postJson<{ orderId: string }>("/api/payments/razorpay/verify", { ...response, token: accessToken })
              .then((result) => resolve({ status: "paid", orderId: result.orderId }))
              .catch((error: Error) =>
                resolve({
                  status: "error",
                  message: `${error.message} If money was debited, it will be confirmed automatically shortly.`,
                })
              );
          },
          modal: {
            ondismiss: () =>
              resolve(lastFailure ? { status: "error", message: lastFailure } : { status: "dismissed" }),
          },
        });

        // Razorpay keeps the window open after a failure so the customer can
        // retry; remember the reason in case they close it instead.
        checkout.on("payment.failed", (response) => {
          lastFailure = response.error.description ?? "Payment failed.";
        });

        checkout.open();
      });
    } catch (error) {
      return { status: "error", message: error instanceof Error ? error.message : "Payment failed." };
    } finally {
      setPaying(false);
    }
  }, []);

  return { pay, paying };
}
