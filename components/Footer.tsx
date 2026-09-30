import Link from "next/link";
import { BUSINESS } from "../lib/business";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="logo footer-logo">
            <span className="logo-mark">A</span>
            <span>
              <strong>AURELIA</strong>
              <small>CERAMICS</small>
            </span>
          </Link>

          <p>
            Premium ceramic crockery for modern homes and professional
            hospitality.
          </p>
        </div>

        <div>
          <h4>Explore</h4>
          <Link href="/products">Products</Link>
          <Link href="/about">About Us</Link>
          <Link href="/contact">Contact</Link>
        </div>

        <div>
          <h4>Policies</h4>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
          <Link href="/shipping-policy">Shipping Policy</Link>
          <Link href="/return-refund-policy">Return &amp; Refund Policy</Link>
        </div>

        <div>
          <h4>Contact</h4>
          <p>{BUSINESS.address}</p>
          <p>
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
          </p>
          <p>
            <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}>{BUSINESS.phone}</a>
          </p>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.
          {BUSINESS.gstin && ` GSTIN: ${BUSINESS.gstin}`}
        </span>
        <span>Premium Ceramic Tableware</span>
      </div>
    </footer>
  );
}
