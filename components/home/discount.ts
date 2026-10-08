/** Whole-number discount off MRP, or 0 when there is none. */
export function discountPercent({ price, mrp }: { price: number; mrp: number | null }) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}
