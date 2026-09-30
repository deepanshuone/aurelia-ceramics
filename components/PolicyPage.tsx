import Link from "next/link";
import { BUSINESS } from "../lib/business";

const POLICIES = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/return-refund-policy", label: "Return & Refund Policy" },
];

/** Shared layout for the legal / policy pages. */
export default function PolicyPage({
  kicker,
  title,
  path,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  path: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="policy-page">
      <section className="page-hero">
        <div className="container">
          <p className="kicker">{kicker}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <p className="policy-updated">Last updated: {BUSINESS.policiesUpdated}</p>
        </div>
      </section>

      <div className="container policy-layout">
        <nav className="policy-nav" aria-label="Policies">
          {POLICIES.map((policy) => (
            <Link key={policy.href} href={policy.href} aria-current={policy.href === path ? "page" : undefined}>
              {policy.label}
            </Link>
          ))}
        </nav>

        <article className="policy-body">
          {children}

          <section>
            <h2>Contact us</h2>
            <p>
              {BUSINESS.legalName}
              <br />
              {BUSINESS.address}
              <br />
              Email: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
              <br />
              Phone: {BUSINESS.phone} ({BUSINESS.supportHours})
              {BUSINESS.gstin && (
                <>
                  <br />
                  GSTIN: {BUSINESS.gstin}
                </>
              )}
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
