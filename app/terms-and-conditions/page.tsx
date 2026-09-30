import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "../../components/PolicyPage";
import { BUSINESS } from "../../lib/business";
import { PAYMENT_WINDOW_MINUTES } from "../../lib/payments";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `The terms that apply when you shop with ${BUSINESS.brand}.`,
  alternates: { canonical: "/terms-and-conditions" },
};

export default function TermsPage() {
  return (
    <PolicyPage
      kicker="POLICIES"
      title="Terms & Conditions"
      path="/terms-and-conditions"
      intro={`These terms apply to your use of this website and to every order placed with ${BUSINESS.legalName}. By using the site or placing an order, you agree to them.`}
    >
      <section>
        <h2>Your account</h2>
        <p>
          You must be at least 18 years old, or use the site under the supervision of a parent or guardian, to place an
          order. Please keep your login details private — you are responsible for activity on your account. Tell us
          straight away if you think someone else has used it.
        </p>
      </section>

      <section>
        <h2>Products</h2>
        <p>
          Many of our pieces are glazed and finished by hand. Small variations in colour, glaze, size and pattern are a
          natural part of ceramic craft and are not defects. Product photos are representative; colours may look
          slightly different on different screens.
        </p>
      </section>

      <section>
        <h2>Prices and orders</h2>
        <ul>
          <li>All prices are in Indian Rupees (₹). Delivery charges, if any, are shown before you place your order.</li>
          <li>
            Placing an order is an offer to buy. We may decline or cancel an order — for example if an item is out of
            stock, a price is shown incorrectly, or we suspect fraud. If you have already paid, we will refund you in
            full.
          </li>
          <li>Coupons must be applied at checkout, cannot be exchanged for cash and are subject to their stated conditions.</li>
          <li>For a GST invoice on business purchases, contact us with your order ID and GSTIN.</li>
        </ul>
      </section>

      <section>
        <h2>Payment</h2>
        <ul>
          <li>
            <strong>Online payment</strong> (UPI, cards, net banking) is processed securely by Razorpay. Online orders
            that are not paid within {PAYMENT_WINDOW_MINUTES} minutes are cancelled automatically and the items released.
          </li>
          <li>
            <strong>Cash on Delivery</strong>, where offered, is paid to the courier when your order arrives. We may
            refuse Cash on Delivery for future orders if deliveries are repeatedly refused.
          </li>
        </ul>
      </section>

      <section>
        <h2>Delivery, returns and refunds</h2>
        <p>
          Delivery is covered by our <Link href="/shipping-policy">Shipping Policy</Link>, and cancellations, returns
          and refunds by our <Link href="/return-refund-policy">Return &amp; Refund Policy</Link>. Both form part of
          these terms.
        </p>
      </section>

      <section>
        <h2>Use of the website</h2>
        <p>
          Please don&apos;t misuse the site — for example by trying to access other people&apos;s accounts, interfering
          with its operation, or copying its content for commercial use. Text, product photography and designs on this
          site belong to us or our licensors.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          We take care to describe products accurately and to deliver them safely. To the extent the law allows, our
          liability for any order is limited to the amount you paid for it, and we are not liable for indirect or
          consequential losses. Nothing in these terms limits your rights under the Consumer Protection Act, 2019.
        </p>
      </section>

      <section>
        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of India. Any dispute will be subject to the jurisdiction of the courts
          at {BUSINESS.jurisdiction}. We would always prefer to resolve concerns directly first — please contact us.
        </p>
      </section>
    </PolicyPage>
  );
}
