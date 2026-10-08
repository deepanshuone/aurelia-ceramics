/**
 * Read-only star rating, e.g. ★★★★☆ 4.6 (12). Without a count (a sample rating,
 * lib/sample-ratings.ts) the review count is left out.
 */
export default function StarRating({ rating, count }: { rating: number; count?: number }) {
  const filled = Math.round(rating);
  const label = count
    ? `Rated ${rating.toFixed(1)} out of 5 from ${count} ${count === 1 ? "review" : "reviews"}`
    : `Rated ${rating.toFixed(1)} out of 5`;
  return (
    <span className="star-rating" aria-label={label}>
      <span className="star-rating-stars" aria-hidden="true">
        {"★".repeat(filled)}
        <span className="star-rating-empty">{"★".repeat(5 - filled)}</span>
      </span>
      <span aria-hidden="true">
        {rating.toFixed(1)} {count ? <span className="star-rating-count">({count})</span> : null}
      </span>
    </span>
  );
}
