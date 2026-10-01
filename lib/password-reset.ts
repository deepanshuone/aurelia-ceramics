import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

// Reset links are stateless: a signed token that carries the customer id and an
// expiry, signed with the site secret AND the customer's current password hash.
// Changing the password changes the hash, so a link stops working the moment it
// has been used (or the password changed any other way) — no database table needed.

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function secret() {
  const value = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!value) throw new Error("NEXTAUTH_SECRET is not set.");
  return value;
}

function sign(customerId: string, expiresAt: number, passwordHash: string) {
  return createHmac("sha256", secret()).update(`password-reset:${customerId}:${expiresAt}:${passwordHash}`).digest("base64url");
}

export function createResetToken(customer: { id: string; passwordHash: string }) {
  const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;
  return `${customer.id}.${expiresAt}.${sign(customer.id, expiresAt, customer.passwordHash)}`;
}

/** Returns the customer a valid, unexpired, unused token belongs to — otherwise null. */
export async function verifyResetToken(token: string | null | undefined) {
  if (!token || token.length > 300) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [customerId, expiry, signature] = parts;

  const expiresAt = Number(expiry);
  if (!/^[a-z0-9]{10,40}$/i.test(customerId) || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  // A token can't legitimately outlive the TTL (guards against hand-edited expiries).
  if (expiresAt > Date.now() + RESET_TOKEN_TTL_MS + 60_000) return null;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, email: true, passwordHash: true, isActive: true },
  });
  if (!customer || !customer.isActive || !customer.passwordHash) return null;

  const expected = Buffer.from(sign(customer.id, expiresAt, customer.passwordHash));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  return { id: customer.id, name: customer.name, email: customer.email, passwordHash: customer.passwordHash };
}
