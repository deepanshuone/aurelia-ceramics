"use client";

// Last-resort fallback when the root layout itself fails. It replaces the
// whole document, so it can't rely on the site's stylesheet.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f1e9", color: "#171614" }}>
        <main style={{ maxWidth: 520, margin: "15vh auto", padding: "0 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#746f67", lineHeight: 1.6 }}>
            The site couldn&apos;t load right now. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, padding: "12px 22px", border: 0, background: "#171614", color: "#fff", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
