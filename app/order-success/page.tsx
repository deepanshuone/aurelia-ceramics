"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  orderId: string;
  total: number;
  date: string;
};

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const savedOrder = localStorage.getItem("aurelia-last-order");

    if (savedOrder) {
      setOrder(JSON.parse(savedOrder));
    }
  }, []);

  if (!order) {
    return (
      <main className="order-success-page">
        <div className="success-card">
          <h1>No Order Found</h1>
          <p>We could not find your recent order.</p>

          <Link href="/products" className="success-btn">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="order-success-page">
      <div className="success-card">
        <div className="success-icon">✓</div>

        <p className="success-label">ORDER CONFIRMED</p>

        <h1>Thank You For Your Order!</h1>

        <p className="success-message">
          Your order has been successfully placed.
        </p>

        <div className="order-details">
          <div>
            <span>Order ID</span>
            <strong>{order.orderId}</strong>
          </div>

          <div>
            <span>Order Total</span>
            <strong>₹{order.total.toLocaleString("en-IN")}</strong>
          </div>

          <div>
            <span>Order Date</span>
            <strong>
              {new Date(order.date).toLocaleDateString("en-IN")}
            </strong>
          </div>
        </div>

        <p className="delivery-message">
          We will contact you shortly with your order and delivery details.
        </p>

        <div className="success-actions">
          <Link href="/products" className="success-btn">
            Continue Shopping
          </Link>

          <Link href="/" className="secondary-btn">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}