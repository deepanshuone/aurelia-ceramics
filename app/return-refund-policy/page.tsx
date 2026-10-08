import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "../../components/PolicyPage";
import { BUSINESS, POLICY } from "../../lib/business";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description: `Cancellations, breakage claims, returns and refunds at ${BUSINESS.brand}.`,
  alternates: { canonical: "/return-refund-policy" },
};

export default function ReturnRefundPolicyPage() {
  return (
    <PolicyPage
      kicker="POLICIES"
      title="Return & Refund Policy"
      path="/return-refund-policy"
      intro="We want every piece to arrive safely and delight you. If something goes wrong, here's how we'll put it right."
    >
      <section>
        <h2>Cancelling an order</h2>
        <ul>
          <li>
            You can cancel an order any time <strong>before it is dispatched</strong>. Email{" "}
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> with your order ID.
          </li>
          <li>Paid orders cancelled before dispatch are refunded in full.</li>
          <li>Once an order has been shipped it can no longer be cancelled, but you may return it as described below.</li>
        </ul>
      </section>

      <section>
        <h2>Broken or damaged on arrival</h2>
        <p>
          Ceramics can occasionally break in transit. If that happens, email us within{" "}
          <strong>{POLICY.damageReportHours} hours of delivery</strong> with your order ID, photos of the damaged item and
          packaging, and your unboxing video if you have one. We will send a free replacement or, if it&apos;s out of
          stock, a full refund for the damaged item — you don&apos;t need to send the broken piece back unless we ask.
        </p>
      </section>

      <section>
        <h2>Wrong or defective item</h2>
        <p>
          If you receive the wrong product, or an item with a manufacturing defect (other than the natural variations
          of hand-finished ceramics), tell us within {POLICY.returnHours} hours of delivery and we&apos;ll arrange a free
          pickup and a replacement or refund.
        </p>
      </section>

      <section>
        <h2>Change of mind</h2>
        <p>
          Unused items in their original packaging can be returned or replaced within {POLICY.returnHours} hours of
          delivery. Please
          contact us first to arrange the return. Return shipping for change-of-mind returns is paid by the customer, and
          the item must reach us unused and undamaged.
        </p>
      </section>

      <section>
        <h2>Not eligible for return</h2>
        <ul>
          <li>Custom, personalised or OEM orders made to your specification.</li>
          <li>Bulk, hotel and restaurant orders, unless agreed otherwise in writing.</li>
          <li>Items that have been used, washed or damaged after delivery.</li>
        </ul>
      </section>

      <section>
        <h2>Refunds</h2>
        <ul>
          <li>
            <strong>Online payments</strong> are refunded to the original payment method (UPI, card or bank) within{" "}
            {POLICY.refundDays} of approval. Your bank may take a little longer to show it.
          </li>
          <li>
            <strong>Cash on Delivery</strong> orders are refunded by bank transfer or UPI to an account you nominate.
          </li>
          <li>
            The status of your order, including any refund, is shown in <Link href="/account/orders">My Orders</Link>.
          </li>
        </ul>
      </section>
    </PolicyPage>
  );
}
