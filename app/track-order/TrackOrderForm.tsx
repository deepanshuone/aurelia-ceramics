"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type DeviceOrder, orderDetailPath, readDeviceOrders } from "../../lib/order-links";

export default function TrackOrderForm() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceOrders, setDeviceOrders] = useState<DeviceOrder[]>([]);

  // Guest orders placed in this browser open straight away.
  useEffect(() => setDeviceOrders(readDeviceOrders()), []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/orders/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, contact }),
      cache: "no-store",
    }).catch(() => null);
    const data = await response?.json().catch(() => ({}));
    setSending(false);

    if (response?.ok && data?.href) {
      router.push(data.href);
    } else if (response?.ok) {
      setMessage(data?.message ?? "Please check your inbox.");
    } else {
      setError(data?.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <form className="track-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="track-order-id">ORDER ID *</label>
          <input
            id="track-order-id"
            type="text"
            placeholder="AC-261008-XXXXXX"
            autoCapitalize="characters"
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="track-contact">EMAIL OR PHONE USED FOR THE ORDER *</label>
          <input
            id="track-contact"
            type="text"
            autoComplete="email"
            placeholder="you@example.com or 98XXXXXXXX"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>

        {message && (
          <p className="track-message" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="place-order-btn" disabled={sending}>
          {sending ? "Checking…" : "Email Me My Order Link →"}
        </button>
      </form>

      {deviceOrders.length > 0 && (
        <section className="device-orders">
          <p className="section-label">ORDERS ON THIS DEVICE</p>
          <ul>
            {deviceOrders.map((entry) => (
              <li key={entry.orderId}>
                <Link href={orderDetailPath(entry.orderId, entry.token)}>
                  <strong>{entry.orderId}</strong>
                  <span>
                    {new Date(entry.placedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
