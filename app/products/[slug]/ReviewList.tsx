"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  verified: boolean;
  author: string;
  date: string;
  /** ISO time, for sorting. */
  createdAt: string;
  photos: string[];
};

type Filter = "all" | "photos" | "verified" | 1 | 2 | 3 | 4 | 5;
type Sort = "recent" | "high" | "low";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="reviews-stars small" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="off">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

/** Customer photos strip, filters, sorting and the review list itself. */
export default function ReviewList({ reviews }: { reviews: PublicReview[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [viewer, setViewer] = useState<string | null>(null);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setViewer(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewer]);

  const allPhotos = useMemo(() => reviews.flatMap((review) => review.photos), [reviews]);
  const hasVerified = reviews.some((review) => review.verified);

  const shown = useMemo(() => {
    const list = reviews.filter((review) =>
      filter === "all"
        ? true
        : filter === "photos"
          ? review.photos.length > 0
          : filter === "verified"
            ? review.verified
            : review.rating === filter,
    );
    return list.sort((a, b) =>
      sort === "high"
        ? b.rating - a.rating || b.createdAt.localeCompare(a.createdAt)
        : sort === "low"
          ? a.rating - b.rating || b.createdAt.localeCompare(a.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
    );
  }, [reviews, filter, sort]);

  if (reviews.length === 0) return null;

  const chips: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    ...(allPhotos.length > 0 ? [{ value: "photos" as const, label: "With photos" }] : []),
    ...(hasVerified ? [{ value: "verified" as const, label: "Verified buyers" }] : []),
    ...([5, 4, 3, 2, 1] as const)
      .filter((star) => reviews.some((review) => review.rating === star))
      .map((star) => ({ value: star, label: `${star} ★` })),
  ];

  return (
    <div className="review-list-wrap">
      {allPhotos.length > 0 && (
        <div className="review-photo-strip">
          <h3>Customer photos</h3>
          <div>
            {allPhotos.slice(0, 12).map((url) => (
              <button key={url} type="button" onClick={() => setViewer(url)} aria-label="View customer photo">
                {/* eslint-disable-next-line @next/next/no-img-element -- customer uploads are served by our own API */}
                <img src={url} alt="Customer photo" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="review-toolbar">
        <div className="review-chips" role="group" aria-label="Filter reviews">
          {chips.map((chip) => (
            <button
              key={String(chip.value)}
              type="button"
              className={filter === chip.value ? "active" : undefined}
              aria-pressed={filter === chip.value}
              onClick={() => setFilter(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <label className="review-sort">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recent">Most recent</option>
            <option value="high">Highest rated</option>
            <option value="low">Lowest rated</option>
          </select>
        </label>
      </div>

      <ul className="reviews-list">
        {shown.map((review) => (
          <li key={review.id}>
            <div className="review-meta">
              <Stars rating={review.rating} />
              {review.verified && <span className="verified-badge">✓ Verified buyer</span>}
            </div>
            {review.title && <h3>{review.title}</h3>}
            {review.comment && <p>{review.comment}</p>}
            {review.photos.length > 0 && (
              <div className="review-photos">
                {review.photos.map((url) => (
                  <button key={url} type="button" onClick={() => setViewer(url)} aria-label="View photo">
                    {/* eslint-disable-next-line @next/next/no-img-element -- customer uploads are served by our own API */}
                    <img src={url} alt={`Photo from ${review.author}`} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <small>
              {review.author} &middot; {review.date}
            </small>
          </li>
        ))}
        {shown.length === 0 && <li className="review-empty">No reviews match this filter.</li>}
      </ul>

      {viewer &&
        createPortal(
          <div
            className="pdp-viewer"
            role="dialog"
            aria-modal="true"
            aria-label="Customer photo"
            onClick={() => setViewer(null)}
          >
            <button type="button" className="pdp-viewer-close" aria-label="Close">
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- customer uploads are served by our own API */}
            <img className="review-viewer-img" src={viewer} alt="Customer photo" />
          </div>,
          document.body,
        )}
    </div>
  );
}
