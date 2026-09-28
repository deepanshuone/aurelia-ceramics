"use client";

import { useState } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  code: string;
  category: {
    name: string;
  };
};

type Props = {
  products: Product[];
  imageMap: Record<string, string>;
  categories: string[];
};

export default function ProductCatalogue({
  products,
  imageMap,
  categories,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState("All Products");

  const filteredProducts =
    selectedCategory === "All Products"
      ? products
      : products.filter(
          (product) => product.category.name === selectedCategory
        );

  return (
    <>
      {/* CATEGORY FILTER */}
      <div className="category-filter">
        {categories.map((category) => (
          <button
            key={category}
            className={selectedCategory === category ? "active" : ""}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* PRODUCT GRID */}
      <div className="catalogue-grid">
        {filteredProducts.map((product) => (
          <article className="catalogue-card" key={product.slug}>
            <a href={`/products/${product.slug}`}>
              <div className="catalogue-image">
                <img
                  src={imageMap[product.slug]}
                  alt={product.name}
                />

                <span className="catalogue-arrow">↗</span>
              </div>
            </a>

            <div className="catalogue-info">
              <div>
                <p>{product.category.name}</p>
                <h3>{product.name}</h3>
              </div>

              <span className="product-code">
                {product.code}
              </span>
            </div>

            <a
              href={`/products/${product.slug}`}
              className="view-product"
            >
              View Product <span>→</span>
            </a>
          </article>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <p className="product-count">
          No products found.
        </p>
      )}
    </>
  );
}