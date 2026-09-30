"use client";

import Link from "next/link";
import { useEffect } from "react";

// Shown when a page throws while rendering (e.g. the database is briefly
// unreachable). The header and footer stay in place.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="product-not-found">
      <p>SOMETHING WENT WRONG</p>

      <h1>
        Sorry, this page
        <br />
        didn&apos;t load.
      </h1>

      <p className="not-found-hint">
        Please try again in a moment.
        {error.digest && <> If it keeps happening, contact us and mention reference {error.digest}.</>}
      </p>

      <div className="not-found-actions">
        <button type="button" className="primary-btn" onClick={reset}>
          Try Again
        </button>
        <Link href="/" className="text-link">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
