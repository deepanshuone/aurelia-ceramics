"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReviewForm, { type ExistingReview } from "./ReviewForm";

type Eligibility = {
  loggedIn: boolean;
  canReview: boolean;
  verified?: boolean;
  existing: ExistingReview | null;
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

  if (state.canReview) {
    return (
      <>
        <ReviewForm slug={slug} existing={state.existing} />
        <p className="reviews-note">
          {state.verified
            ? "Your review will show a “Verified buyer” label because you received this product."
            : "Your review will be posted without the “Verified buyer” label, which is only for customers who received this product."}
        </p>
      </>
    );
  }

  return (
    <p className="reviews-note">
      <Link href={`/login?callbackUrl=/products/${slug}`}>Log in</Link> to write a review. Don&apos;t have an account?{" "}
      <Link href={`/register`}>Create one</Link>.
    </p>
  );
}
