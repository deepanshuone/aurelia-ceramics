/**
 * Sample star ratings for showing the design before the store has real
 * reviews. Turned on in Admin → Settings ("Show sample ratings"); off by
 * default. They are never stored: a product with real reviews always shows
 * its real average, and turning the switch off removes every sample at once.
 * Samples carry no review count, reviewer or text, and are never sent to
 * search engines as structured data.
 */

const MIN_SAMPLE = 3.5;
const MAX_SAMPLE = 4.8;

/** A stable rating between 3.5 and 4.8 for a product (same id, same number). */
export function sampleRating(productId: string) {
  // FNV-1a hash of the id, so the number doesn't change between page loads.
  let hash = 0x811c9dc5;
  for (let i = 0; i < productId.length; i++) {
    hash ^= productId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const steps = Math.round((MAX_SAMPLE - MIN_SAMPLE) * 10) + 1;
  return Math.round((MIN_SAMPLE + ((hash >>> 0) % steps) / 10) * 10) / 10;
}

export type ShownRating = {
  /** The rating to display, or null to show none. */
  rating: number | null;
  /** True when `rating` is a sample rather than the average of real reviews. */
  isSample: boolean;
};

/** The real average when the product has reviews, otherwise a sample when samples are switched on. */
export function shownRating(
  product: { id: string; rating: unknown; reviewCount: number },
  showSamples: boolean,
): ShownRating {
  if (product.reviewCount > 0 && product.rating !== null && product.rating !== undefined) {
    return { rating: Number(product.rating), isSample: false };
  }
  if (showSamples) return { rating: sampleRating(product.id), isSample: true };
  return { rating: null, isSample: false };
}
