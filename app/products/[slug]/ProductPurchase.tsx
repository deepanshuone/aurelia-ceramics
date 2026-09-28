"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "../../../lib/cart";
type ProductPurchaseProps = {
  product: {
    slug: string;
    name: string;
    price: number;
    image: string;
    stock: number;
  };
};

export default function ProductPurchase({
  product,
}: ProductPurchaseProps) {
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(product.stock, current + 1)
    );
  }

  function handleAddToCart() {
    addToCart({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
    });

    alert("Product added to cart!");
  }

  function handleBuyNow() {
    addToCart({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
    });

    router.push("/cart");
  }

  return (
    <>
      <div className="quantity-section">
        <label>QUANTITY</label>

        <div className="quantity-control">
          <button
            type="button"
            onClick={decreaseQuantity}
          >
            −
          </button>

          <span>{quantity}</span>

          <button
            type="button"
            onClick={increaseQuantity}
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
        >
          Add to Cart
        </button>

        <button
          type="button"
          className="buy-now-btn"
          onClick={handleBuyNow}
        >
          Buy Now
        </button>
      </div>
    </>
  );
}