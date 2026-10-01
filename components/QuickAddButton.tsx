"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

/** One-click "Add to cart" for product cards (quantity 1, stock-checked by the server). */
export default function QuickAddButton({ slug, name, inStock }: { slug: string; name: string; inStock: boolean }) {
  const { addItem } = useCart();
  const [state, setState] = useState<"idle" | "adding" | "added" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!inStock) {
    return (
      <button type="button" className="quick-add" disabled>
        Out of stock
      </button>
    );
  }

  async function handleClick() {
    setState("adding");
    setError(null);
    const result = await addItem(slug, 1);
    if (result.ok) {
      setState("added");
      setTimeout(() => setState("idle"), 1800);
    } else {
      setState("error");
      setError(result.error);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`quick-add${state === "added" ? " added" : ""}`}
        onClick={handleClick}
        disabled={state === "adding"}
        aria-label={`Add to cart: ${name}`}
      >
        {state === "adding" ? "Adding…" : state === "added" ? "Added ✓" : "Add to cart"}
      </button>
      {state === "error" && error && (
        <small className="quick-add-error" role="alert">
          {error}
        </small>
      )}
    </>
  );
}
