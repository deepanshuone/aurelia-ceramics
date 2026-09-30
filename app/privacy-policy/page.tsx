import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage from "../../components/PolicyPage";
import { BUSINESS } from "../../lib/business";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${BUSINESS.brand} collects, uses and protects your personal information.`,
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      kicker="POLICIES"
      title="Privacy Policy"
      path="/privacy-policy"
      intro={`This policy explains what personal information ${BUSINESS.brand} collects when you use our website, why we collect it and how we keep it safe.`}
    >
      <section>
        <h2>Information we collect</h2>
        <ul>
          <li>
            <strong>Account details</strong> — your name, email address, phone number and password when you register.
            Passwords are stored only as a secure one-way hash; we can never see them.
          </li>
          <li>
            <strong>Delivery details</strong> — the name, phone number, email and address you give at checkout, and any
            addresses you choose to save to your account.
          </li>
          <li>
            <strong>Orders</strong> — the products you buy, amounts paid, coupons used and delivery status.
          </li>
          <li>
            <strong>Enquiries</strong> — what you send us through the contact form.
          </li>
          <li>
            <strong>Technical data</strong> — your IP address and basic request information, used to keep the site secure
            (for example, to limit repeated login attempts).
          </li>
        </ul>
        <p>
          We do <strong>not</strong> receive or store your card, UPI or bank details. Online payments are processed
          directly by our payment partner, Razorpay, under its own security standards.
        </p>
      </section>

      <section>
        <h2>How we use your information</h2>
        <ul>
          <li>To process, deliver and support your orders, including sending order and delivery updates.</li>
          <li>To manage your account, saved addresses and order history.</li>
          <li>To reply to your enquiries and provide customer support.</li>
          <li>To prevent fraud and abuse and to keep the website secure.</li>
          <li>To meet our legal, tax and accounting obligations.</li>
        </ul>
        <p>We do not sell your personal information, and we do not send marketing messages without your consent.</p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>We share only what is needed, only with service providers who help us run the store:</p>
        <ul>
          <li>Razorpay, to process online payments and refunds;</li>
          <li>courier and logistics partners, to deliver your order;</li>
          <li>our website hosting and database providers, which store data on our behalf;</li>
          <li>government or law-enforcement authorities, where the law requires it.</li>
        </ul>
      </section>

      <section>
        <h2>Cookies and local storage</h2>
        <p>
          We use a secure cookie to keep you signed in, and your browser&apos;s local storage to remember a guest
          shopping cart. We do not use advertising or tracking cookies.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep account information while your account is active. Order and invoice records are kept for as long as
          Indian tax and accounting laws require. Enquiries are deleted once they are no longer needed.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Under India&apos;s Digital Personal Data Protection Act, 2023, you may ask us to access, correct or delete
          your personal information, or withdraw consent. You can update your saved addresses in{" "}
          <Link href="/account">your account</Link>; for anything else, email us at{" "}
          <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. Some records (such as invoices) may need to be kept
          to comply with the law.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          We use encrypted (HTTPS) connections, hashed passwords and restricted staff access to protect your
          information. No system is completely secure, so please use a strong, unique password for your account.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The &ldquo;last updated&rdquo; date above shows when it last
          changed. Significant changes will be highlighted on this page.
        </p>
      </section>
    </PolicyPage>
  );
}
