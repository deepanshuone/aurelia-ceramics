"use client";

import { useEffect, useState } from "react";
import ProductCatalogue from "./ProductCatalogue";

type Suggestion = Parameters<typeof ProductCatalogue>[0]["products"][number];

/**
 * "You may also like" picks for the cart page. Works for an empty cart
 * (popular items) and a filled one (same-category items, plus ones that would
 * unlock free delivery). Refreshes whenever the cart changes.
 */
export default function CartSuggestions({
  excludeSlugs,
  needForFreeDelivery,
  label,
  heading,
}: {
  excludeSlugs: string[];
  needForFreeDelivery: number;
  label: string;
  heading: string;
}) {
  const [products, setProducts] = useState<Suggestion[] | null>(null);
  const key = `${excludeSlugs.join(",")}|${needForFreeDelivery}`;

  useEffect(() => {
    const controller = new AbortController();
    // Small delay so quick +/- clicks in the cart don't fire a request each.
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ limit: "4", need: String(needForFreeDelivery) });
      if (excludeSlugs.length) query.set("exclude", excludeSlugs.join(","));
      fetch(`/api/products/recommend?${query}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { products: [] }))
        .then((data: { products?: Suggestion[] }) => setProducts(data.products ?? []))
        .catch(() => {
          if (!controller.signal.aborted) setProducts((current) => current ?? []);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `key` captures excludeSlugs and needForFreeDelivery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (products && products.length === 0) return null;

  return (
    <section className="cart-suggestions" aria-label={label}>
      <p className="section-label">{label}</p>
      <h2>{heading}</h2>
      {products ? <ProductCatalogue products={products} /> : <div className="cart-suggestions-loading skeleton" aria-busy="true" />}
    </section>
  );
}
