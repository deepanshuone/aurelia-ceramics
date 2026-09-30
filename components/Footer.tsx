import Link from "next/link";

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
          <p>India</p>
          <p>hello@aureliaceramics.com</p>
          <p>+91 00000 00000</p>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© 2026 Aurelia Ceramics. All rights reserved.</span>
        <span>Premium Ceramic Tableware</span>
      </div>
    </footer>
  );
}
