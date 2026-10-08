// Bot check (Cloudflare Turnstile) for login, sign-up and the sign-up OTP.
//
// Needs NEXT_PUBLIC_TURNSTILE_SITE_KEY (shown to the browser) and
// TURNSTILE_SECRET_KEY (server only), both from the Cloudflare dashboard →
// Turnstile. Until both are set the check is switched off, so the site keeps
// working without them.

import { createHmac, timingSafeEqual } from "crypto";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isCaptchaConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

/** True when the token passes Turnstile, or when the check is switched off. */
export async function verifyCaptcha(token: unknown, ip: string) {
  if (!isCaptchaConfigured()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  const form = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY ?? "", response: token });
  if (ip && ip !== "unknown") form.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body: form, signal: AbortSignal.timeout(8_000) });
    const data = (await res.json().catch(() => null)) as { success?: boolean; "error-codes"?: string[] } | null;
    if (!res.ok || !data) throw new Error(`siteverify answered ${res.status}`);
    if (data.success) return true;
    const codes = data["error-codes"] ?? [];
    // A wrong secret key would otherwise lock every customer and admin out.
    if (codes.some((code) => code.includes("secret"))) {
      console.error("TURNSTILE_SECRET_KEY is invalid; bot check skipped", codes);
      return true;
    }
    return false;
  } catch (error) {
    // Cloudflare unreachable: let the request through (rate limits still
    // apply) rather than lock every customer and admin out.
    console.error("Turnstile check failed; allowing request", error);
    return true;
  }
}

export const CAPTCHA_ERROR = "Please complete the security check and try again.";

// A Turnstile token works once, and sign-up already spent it. The register
// API hands back this short-lived ticket so the automatic sign-in right after
// sign-up doesn't need a second check.
const TICKET_TTL_MS = 2 * 60 * 1000;

function ticketSignature(email: string, expiresAt: number) {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "")
    .update(`signup-ticket:${email.toLowerCase()}:${expiresAt}`)
    .digest("base64url");
}

export function createSignupTicket(email: string) {
  const expiresAt = Date.now() + TICKET_TTL_MS;
  return `${expiresAt}.${ticketSignature(email, expiresAt)}`;
}

export function isValidSignupTicket(ticket: unknown, email: string) {
  if (typeof ticket !== "string" || !process.env.NEXTAUTH_SECRET) return false;
  const [expires, signature] = ticket.split(".");
  const expiresAt = Number(expires);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = Buffer.from(ticketSignature(email, expiresAt));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
