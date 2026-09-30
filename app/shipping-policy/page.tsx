import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "../../components/PolicyPage";
import { BUSINESS, POLICY } from "../../lib/business";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: `Delivery charges, timelines and packaging for ${BUSINESS.brand} orders.`,
  alternates: { canonical: "/shipping-policy" },
};

const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function ShippingPolicyPage() {
  return (
    <PolicyPage
      kicker="POLICIES"
      title="Shipping Policy"
      path="/shipping-policy"
      intro="Ceramics need careful handling. Here is how we pack and deliver your order."
    >
      <section>
        <h2>Where we deliver</h2>
        <p>We currently deliver to addresses across India. We do not ship internationally yet.</p>
      </section>

      <section>
        <h2>Delivery charges</h2>
        <ul>
          <li>
            <strong>Free delivery</strong> on orders of {rupees(POLICY.freeDeliveryThreshold)} or more (product value,
            before any coupon).
          </li>
          <li>
            A flat delivery charge of {rupees(POLICY.deliveryFee)} applies to orders below{" "}
            {rupees(POLICY.freeDeliveryThreshold)}.
          </li>
          <li>The exact charge is always shown at checkout before you pay.</li>
        </ul>
      </section>

      <section>
        <h2>Timelines</h2>
        <ul>
          <li>Orders are packed and dispatched within {POLICY.dispatchDays} of confirmation.</li>
          <li>Delivery usually takes {POLICY.deliveryDays} after dispatch, depending on your location.</li>
          <li>
            Bulk, hotel and custom orders follow the timeline agreed with you, and may be delivered in more than one
            shipment.
          </li>
        </ul>
        <p>
          Online orders are dispatched once payment is confirmed. Cash on Delivery orders are confirmed straight away.
        </p>
      </section>

      <section>
        <h2>Tracking</h2>
        <p>
          Once your order ships, the courier name and tracking number appear on the order page in{" "}
          <Link href="/account/orders">My Orders</Link>.
        </p>
      </section>

      <section>
        <h2>Packaging</h2>
        <p>
          Every piece is individually wrapped and packed in protective cartons to survive the journey. If a parcel looks
          damaged when it arrives, please note this with the courier and record an unboxing video — it makes any claim
          much faster.
        </p>
      </section>

      <section>
        <h2>Delays and failed deliveries</h2>
        <p>
          Courier delays caused by weather, strikes or other events outside our control can happen; we&apos;ll keep you
          updated. Please make sure your address and phone number are correct — if a delivery fails because of incorrect
          details or repeated unavailability, re-delivery charges may apply.
        </p>
      </section>

      <section>
        <h2>Damaged in transit?</h2>
        <p>
          See our <Link href="/return-refund-policy">Return &amp; Refund Policy</Link> — report breakage within{" "}
          {POLICY.damageReportHours} hours of delivery and we&apos;ll replace or refund the item.
        </p>
      </section>
    </PolicyPage>
  );
}
