import Link from "next/link";
import "./checkout-flow.css";

const STEPS = ["Cart", "Address", "Payment", "Confirmed", "Track"] as const;

export type CheckoutStep = (typeof STEPS)[number];

/** Where the shopper is in Cart → Address → Payment → Confirmed → Track. */
export default function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const currentIndex = STEPS.indexOf(current);

  return (
    <ol className="checkout-steps" aria-label="Checkout progress">
      {STEPS.map((step, index) => (
        <li
          key={step}
          className={index < currentIndex ? "done" : index === currentIndex ? "current" : undefined}
          aria-current={index === currentIndex ? "step" : undefined}
        >
          {/* Going back to the cart is the only step worth linking to. */}
          {step === "Cart" && index < currentIndex && currentIndex < 3 ? <Link href="/cart">{step}</Link> : step}
        </li>
      ))}
    </ol>
  );
}
