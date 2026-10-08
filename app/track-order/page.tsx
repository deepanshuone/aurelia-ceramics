import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "../../auth";
import "../../components/checkout-flow.css";
import TrackOrderForm from "./TrackOrderForm";

export const metadata: Metadata = {
  title: "Track Order",
  description: "Check the status and delivery date of your Aurelia Ceramics order.",
};

export default async function TrackOrderPage() {
  const session = await auth();

  return (
    <main className="track-page">
      <div className="track-container">
        <p className="section-label">TRACK ORDER</p>
        <h1>
          Where is
          <br />
          <em>my order?</em>
        </h1>
        <p className="track-intro">
          {session?.user?.id ? (
            <>
              Your orders are all in <Link href="/account/orders">My Orders</Link>. For an order placed
              without logging in, enter its details below.
            </>
          ) : (
            <>
              Enter your order ID (it&apos;s in your confirmation email) and the email or phone you
              ordered with. We&apos;ll email you a link to see its status, delivery date and tracking.
              Have an account? <Link href="/login?callbackUrl=/account/orders">Log in</Link> to see all
              your orders.
            </>
          )}
        </p>

        <TrackOrderForm />
      </div>
    </main>
  );
}
