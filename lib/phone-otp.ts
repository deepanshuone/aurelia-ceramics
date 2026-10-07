import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_MS = 60 * 1000; // wait between sends to one number

/** Indian mobile number: 10 digits starting 6-9. */
export const PHONE_PATTERN = /^[6-9]\d{9}$/;

function hashCode(phone: string, code: string) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set.");
  return createHmac("sha256", secret).update(`phone-otp:${phone}:${code}`).digest("base64url");
}

/** True when another account already uses this mobile number. */
export async function isPhoneTaken(phone: string) {
  return Boolean(await prisma.customer.findFirst({ where: { phone }, select: { id: true } }));
}

/**
 * Creates a fresh code for `phone`, replacing any earlier one.
 * Returns null if the last code was sent less than OTP_RESEND_MS ago.
 */
export async function createPhoneOtp(phone: string) {
  const latest = await prisma.phoneOtp.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (latest && Date.now() - latest.createdAt.getTime() < OTP_RESEND_MS) return null;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.$transaction([
    prisma.phoneOtp.deleteMany({ where: { OR: [{ phone }, { expiresAt: { lt: new Date() } }] } }),
    prisma.phoneOtp.create({
      data: { phone, codeHash: hashCode(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    }),
  ]);
  return code;
}

export type OtpCheck = "ok" | "invalid" | "expired" | "too_many";

/** Checks a code without using it up. Wrong guesses count towards OTP_MAX_ATTEMPTS. */
export async function checkPhoneOtp(phone: string, code: string): Promise<OtpCheck> {
  const otp = await prisma.phoneOtp.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (!otp || otp.expiresAt < new Date()) return "expired";
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return "too_many";

  const expected = Buffer.from(otp.codeHash);
  const received = Buffer.from(/^\d{6}$/.test(code) ? hashCode(phone, code) : "");
  if (expected.length === received.length && timingSafeEqual(expected, received)) return "ok";

  await prisma.phoneOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
  return otp.attempts + 1 >= OTP_MAX_ATTEMPTS ? "too_many" : "invalid";
}

/** Removes the codes for `phone` once it has been used. */
export async function clearPhoneOtp(phone: string) {
  await prisma.phoneOtp.deleteMany({ where: { phone } });
}

export const OTP_MESSAGES: Record<Exclude<OtpCheck, "ok">, string> = {
  invalid: "That OTP is not correct. Please check the SMS and try again.",
  expired: "This OTP has expired. Please request a new one.",
  too_many: "Too many wrong attempts. Please request a new OTP.",
};
