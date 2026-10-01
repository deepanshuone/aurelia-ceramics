"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Star-rating form for signed-in customers (also edits their existing review). */
export default function ReviewForm({
  slug,
  existing,
}: {
  slug: string;
  existing: { rating: number; title: string; comment: string } | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }
    setStatus("saving");
    setError(null);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, rating, title, comment }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("idle");
      setError(data.error ?? "Could not save your review.");
      return;
    }
    setStatus("saved");
    router.refresh();
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>{existing ? "Update your review" : "Write a review"}</h3>

      <div className="star-input" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className={(hover || rating) >= star ? "on" : undefined}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(star)}
          >
            ★
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Headline (optional)"
        maxLength={100}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Review headline"
      />
      <textarea
        rows={4}
        placeholder="How is the quality, finish and size? (optional)"
        maxLength={2000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        aria-label="Review"
      />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {status === "saved" && (
        <p className="review-saved" role="status">
          Thank you — your review is live.
        </p>
      )}

      <button type="submit" className="review-submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : existing ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}
