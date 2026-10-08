import Link from "next/link";
import type { ReactNode } from "react";
import { POLICY } from "../../lib/business";
import type { DeliveryRules } from "../../lib/cart";
import { formatRupees } from "../../lib/order-display";

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

const ICONS = {
  truck: icon(
    <>
      <path d="M2 6h11v10H2zM13 9h4.5L21 12.5V16h-8" />
      <circle cx="6" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>,
  ),
  lock: icon(
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="1.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5" />
    </>,
  ),
  box: icon(
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </>,
  ),
  returns: icon(
    <>
      <path d="M4 9h11a5 5 0 0 1 0 10H8" />
      <path d="M8 5 4 9l4 4" />
    </>,
  ),
};

/**
 * Shopping promises under the hero. Every line is read from the store's real
 * settings and policies, so it stays true when those change.
 */
export default function TrustStrip({ delivery, onlinePayments }: { delivery: DeliveryRules; onlinePayments: boolean }) {
  const alwaysFree = delivery.deliveryFee <= 0 || delivery.freeDeliveryThreshold <= 0;
  const items = [
    {
      icon: ICONS.truck,
      title: "Free Shipping",
      text: alwaysFree ? "On every order" : `On orders ${formatRupees(delivery.freeDeliveryThreshold)}+`,
      href: "/shipping-policy",
    },
    {
      icon: ICONS.lock,
      title: "Secure Payments",
      text: onlinePayments ? "UPI, cards & net banking via Razorpay, or COD" : "Cash on Delivery available",
      href: "/terms-and-conditions",
    },
    {
      icon: ICONS.box,
      title: "Safe Packaging",
      text: "Every piece individually wrapped",
      href: "/shipping-policy",
    },
    {
      icon: ICONS.returns,
      title: "Easy Returns",
      text: `${POLICY.returnHours} hr return or replacement, free replacement if broken in transit`,
      href: "/return-refund-policy",
    },
  ];

  return (
    <section className="trust-strip" aria-label="Shopping with us">
      <div className="container trust-grid">
        {items.map((item) => (
          <Link href={item.href} className="trust-item" key={item.title}>
            <span className="trust-icon">{item.icon}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
