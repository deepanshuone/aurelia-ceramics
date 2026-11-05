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

// GST added on top of the selling price at checkout. Customers see it as a
// "GST" line with the rupee amount only. Change the rate here.
export const GST_PERCENT = 5;

/** GST in paise on a taxable amount in paise (rounded to the nearest paisa). */
export function gstPaise(taxablePaise: number) {
  return Math.round((Math.max(0, taxablePaise) * GST_PERCENT) / 100);
}

/** GST in rupees on a taxable amount in rupees. Same rounding as checkout. */
export function gstOn(taxable: number) {
  return gstPaise(Math.round(taxable * 100)) / 100;
}
