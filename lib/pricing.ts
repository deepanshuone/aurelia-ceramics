// Products have a selling price (what the customer pays) and an optional MRP
// (the "product price" shown struck through). The discount is worked out from
// the two, so admins never type it in separately.

/** Whole-number discount off MRP, or 0 when there is none. */
export function discountPercent({ price, mrp }: { price: number; mrp: number | null }) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** Rupees saved per unit against MRP, or 0 when there is no MRP above the price. */
export function savingsPerUnit({ price, mrp }: { price: number; mrp: number | null }) {
  if (!mrp || mrp <= price) return 0;
  return Math.round((mrp - price) * 100) / 100;
}
