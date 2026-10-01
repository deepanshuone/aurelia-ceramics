import Link from "next/link";
import { POLICY } from "../lib/business";

/** Thin offer strip above the header. */
export default function AnnouncementBar() {
  return (
    <div className="announcement-bar">
      <p>
        <span>Free delivery on orders above ₹{POLICY.freeDeliveryThreshold.toLocaleString("en-IN")}</span>
        <span aria-hidden="true">·</span>
        <span>Cash on Delivery available</span>
        <span aria-hidden="true" className="announcement-extra">·</span>
        <Link href="/contact?requirement=Wholesale%20%2F%20Bulk%20order" className="announcement-extra">
          Bulk &amp; hotel orders — get a quote →
        </Link>
      </p>
    </div>
  );
}
