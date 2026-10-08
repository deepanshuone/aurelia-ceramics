"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import SmartImage from "../SmartImage";
import QuickAddButton from "../QuickAddButton";
import StarRating from "./StarRating";
import { formatRupees } from "../../lib/order-display";
import { discountPercent } from "../../lib/pricing";
import type { HomeProduct } from "../../lib/home";

const LOW_STOCK = 5;

/** "Quick view" button on a product card: opens a dialog with photos, price and Add to cart. */
export default function QuickViewButton({ product }: { product: HomeProduct }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const images = product.images.length > 0 ? product.images : ["/placeholder-product.svg"];
  const off = discountPercent(product);

  function show() {
    setActive(0);
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" className="quick-view-btn" onClick={show} aria-label={`Quick view: ${product.name}`}>
        Quick view
      </button>

      <dialog
        ref={dialogRef}
        className="quick-view"
        aria-label={product.name}
        onClose={() => setOpen(false)}
        // A click on the backdrop lands on the dialog element itself.
        onClick={(event) => event.target === event.currentTarget && close()}
      >
        {open && (
          <div className="quick-view-body">
            <button type="button" className="quick-view-close" onClick={close} aria-label="Close">
              ×
            </button>

            <div className="quick-view-gallery">
              <div className="quick-view-main">
                <SmartImage src={images[active]} alt={product.name} fill sizes="(max-width: 760px) 90vw, 420px" />
              </div>
              {images.length > 1 && (
                <div className="quick-view-thumbs">
                  {images.map((src, index) => (
                    <button
                      type="button"
                      key={src}
                      className={index === active ? "active" : undefined}
                      onClick={() => setActive(index)}
                      aria-label={`Photo ${index + 1}`}
                    >
                      <SmartImage src={src} alt="" fill sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="quick-view-details">
              <p className="quick-view-category">{product.category}</p>
              <h3>{product.name}</h3>
              {product.rating !== null && <StarRating rating={product.rating} count={product.reviewCount || undefined} />}

              <div className="home-card-price quick-view-price">
                <strong>{formatRupees(product.price)}</strong>
                {off > 0 && product.mrp && (
                  <>
                    <s>{formatRupees(product.mrp)}</s>
                    <span className="home-badge">{off}% OFF</span>
                  </>
                )}
              </div>

              {product.description && <p className="quick-view-description">{product.description}</p>}

              <p className={`quick-view-stock${product.stock <= 0 ? " out" : ""}`}>
                {product.stock <= 0
                  ? "Out of stock"
                  : product.stock <= LOW_STOCK
                    ? `Only ${product.stock} left in stock`
                    : "In stock"}
              </p>

              <div className="quick-view-actions">
                <QuickAddButton slug={product.slug} name={product.name} inStock={product.stock > 0} />
                <Link href={`/products/${product.slug}`} className="view-product">
                  View full details <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
