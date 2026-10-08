"use client";

import { useState } from "react";
import { discountPercent, savingsPerUnit } from "../../../lib/pricing";
import { formatRupees } from "../../../lib/order-display";

/**
 * MRP (product price) and selling price, with the discount worked out live.
 * Typing a discount % fills in the selling price from the MRP.
 */
export default function PriceFields({ price: initialPrice, mrp: initialMrp }: { price: string; mrp: string }) {
  const [mrp, setMrp] = useState(initialMrp);
  const [price, setPrice] = useState(initialPrice);

  const mrpValue = Number(mrp) || 0;
  const priceValue = Number(price) || 0;
  const off = priceValue > 0 ? discountPercent({ price: priceValue, mrp: mrpValue || null }) : 0;
  const tooLow = mrpValue > 0 && priceValue > mrpValue;

  function applyDiscount(text: string) {
    const percent = Number(text);
    if (!mrpValue || !Number.isFinite(percent) || percent < 0 || percent >= 100) return;
    setPrice(String(Math.round(mrpValue * (100 - percent)) / 100));
  }

  return (
    <fieldset className="admin-fieldset">
      <legend>Pricing</legend>
      <div className="admin-field-row">
        <label className="admin-field">
          <span>MRP / product price (₹)</span>
          <input
            name="mrp"
            type="number"
            step="0.01"
            min="0"
            value={mrp}
            onChange={(event) => setMrp(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="admin-field">
          <span>Selling price (₹) *</span>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </label>
        <label className="admin-field">
          <span>Discount %</span>
          <input
            key={`${mrp}|${price}`}
            type="number"
            step="1"
            min="0"
            max="99"
            defaultValue={off || ""}
            disabled={!mrpValue}
            placeholder={mrpValue ? "0" : "Set MRP first"}
            onBlur={(event) => applyDiscount(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyDiscount(event.currentTarget.value);
              }
            }}
          />
        </label>
      </div>
      <p className={tooLow ? "admin-hint text-danger" : "admin-hint"} role="status">
        {tooLow
          ? "Selling price is higher than the MRP. Lower it or raise the MRP."
          : off > 0
            ? `Customers see ${formatRupees(priceValue)} with ${formatRupees(mrpValue)} struck through and ${off}% OFF (they save ${formatRupees(savingsPerUnit({ price: priceValue, mrp: mrpValue }))}).`
            : "Customers pay the selling price. Add an MRP above it to show a discount; it's worked out for you."}
      </p>
    </fieldset>
  );
}
