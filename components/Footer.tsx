import Link from "next/link";
import { BUSINESS } from "../lib/business";
import { getNavCategories } from "../lib/nav";

export default async function Footer() {
  // Largest categories first, so the footer highlights the main ranges.
  const topCategories = (await getNavCategories()).sort((a, b) => b.count - a.count).slice(0, 6);

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
          <h4>Shop</h4>
          {topCategories.map((category) => (
            <Link key={category.name} href={`/products?category=${encodeURIComponent(category.name)}`}>
              {category.name}
            </Link>
          ))}
          <Link href="/products">All products →</Link>
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
