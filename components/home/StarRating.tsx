/** Read-only star rating, e.g. ★★★★☆ 4.6 (12). Only render it for products with real reviews. */
export default function StarRating({ rating, count }: { rating: number; count: number }) {
  const filled = Math.round(rating);
  return (
    <span className="star-rating" aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${count} ${count === 1 ? "review" : "reviews"}`}>
      <span className="star-rating-stars" aria-hidden="true">
        {"★".repeat(filled)}
        <span className="star-rating-empty">{"★".repeat(5 - filled)}</span>
      </span>
      <span aria-hidden="true">
        {rating.toFixed(1)} <span className="star-rating-count">({count})</span>
      </span>
    </span>
  );
}
