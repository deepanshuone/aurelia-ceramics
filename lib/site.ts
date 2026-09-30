// Canonical site details used for metadata, sitemap, robots and structured data.

export const SITE_NAME = "AURELIA Ceramics";

export const SITE_DESCRIPTION =
  "Premium ceramic crockery for homes, hospitality and modern dining — dinner sets, plates, bowls, mugs, tea sets, jars, planters and hand-painted Khurja pottery.";

/**
 * Absolute base URL of the public site, without a trailing slash.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://www.aureliaceramics.in);
 * on Vercel the production domain is used as a fallback.
 */
export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

/**
 * Only allow redirects to paths on this site. Rejects absolute URLs and
 * protocol-relative ("//evil.com") or backslash ("/\\evil.com") tricks that
 * browsers treat as another host, preventing open redirects after login.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/account") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

/** Serialises JSON-LD for a <script> tag without allowing "</script>" breakout. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
