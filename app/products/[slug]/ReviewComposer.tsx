"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReviewForm from "./ReviewForm";

type Eligibility = {
  loggedIn: boolean;
  canReview: boolean;
  existing: { rating: number; title: string; comment: string } | null;
};

/**
 * Per-visitor part of the reviews section. It is fetched in the browser so the
 * product page itself stays fully cached (no login check during rendering).
 */
export default function ReviewComposer({ slug }: { slug: string }) {
  const [state, setState] = useState<Eligibility | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reviews?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Eligibility) => !cancelled && setState(data))
      .catch(() => !cancelled && setState({ loggedIn: false, canReview: false, existing: null }));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!state) return <div className="reviews-note skeleton" style={{ height: 72 }} aria-busy="true" />;

  if (state.canReview) return <ReviewForm slug={slug} existing={state.existing} />;

  return (
    <p className="reviews-note">
      {state.loggedIn ? (
        "You can review this product once your order has been delivered."
      ) : (
        <>
          Bought this? <Link href={`/login?callbackUrl=/products/${slug}`}>Log in</Link> after delivery to share your
          review.
        </>
      )}
    </p>
  );
}
