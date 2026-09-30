"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../../../components/CartProvider";

type ProductPurchaseProps = {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    image: string;
    stock: number;
  };
};

export default function ProductPurchase({ product }: ProductPurchaseProps) {
  const router = useRouter();
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outOfStock = product.stock <= 0;

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => Math.min(product.stock, current + 1));
  }

  async function add() {
    setPending(true);
    setError(null);
    const result = await addItem(product.slug, quantity);
    setPending(false);
    if (!result.ok) setError(result.error);
    return result.ok;
  }

  async function handleAddToCart() {
    if (outOfStock || pending) return;

    if (await add()) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  }

  async function handleBuyNow() {
    if (outOfStock || pending) return;

    if (await add()) router.push("/cart");
  }

  return (
    <>
      <div className="quantity-section">
        <label>QUANTITY</label>

        <div className="quantity-control">
          <button
            type="button"
            onClick={decreaseQuantity}
            disabled={outOfStock}
          >
            −
          </button>

          <span>{quantity}</span>

          <button
            type="button"
            onClick={increaseQuantity}
            disabled={outOfStock}
          >
            +
          </button>
        </div>
      </div>

      <div className="ecommerce-actions">
        <button
          type="button"
          className="add-cart-btn"
          onClick={handleAddToCart}
          disabled={outOfStock || pending}
        >
          {outOfStock ? "Out of Stock" : pending ? "Adding…" : added ? "Added ✓" : "Add to Cart"}
        </button>

        <button
          type="button"
          className="buy-now-btn"
          onClick={handleBuyNow}
          disabled={outOfStock || pending}
        >
          Buy Now
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
