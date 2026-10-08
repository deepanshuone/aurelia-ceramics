import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";
import { checkPhoneOtp, clearPhoneOtp, isPhoneTaken, OTP_MESSAGES, PHONE_PATTERN } from "../../../../lib/phone-otp";
import { isSmsConfigured } from "../../../../lib/sms";
import { CAPTCHA_ERROR, createSignupTicket, verifyCaptcha } from "../../../../lib/captcha";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Please enter a valid 10-digit mobile number."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password is too long."),
  otp: z.string().trim().optional(),
  captchaToken: z.string().optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many sign-up attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { name, email, phone, password, otp, captchaToken } = parsed.data;

  if (!(await verifyCaptcha(captchaToken, ip))) {
    return NextResponse.json({ error: CAPTCHA_ERROR }, { status: 400 });
  }

  const existing = await prisma.customer.findUnique({ where: { email } });

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  if (await isPhoneTaken(phone)) {
    return NextResponse.json(
      { error: "An account with this mobile number already exists. Please sign in." },
      { status: 409 }
    );
  }

  // With SMS set up, the mobile number must be verified with an OTP first.
  const verifyPhone = isSmsConfigured();
  if (verifyPhone) {
    if (!otp) {
      return NextResponse.json({ error: "Please verify your mobile number with the OTP." }, { status: 400 });
    }
    const check = await checkPhoneOtp(phone, otp);
    if (check !== "ok") {
      return NextResponse.json({ error: OTP_MESSAGES[check] }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const customer = await prisma.customer.create({
    data: { name, email, phone, passwordHash, phoneVerifiedAt: verifyPhone ? new Date() : null },
    select: { id: true, name: true, email: true },
  });

  if (verifyPhone) await clearPhoneOtp(phone);

  return NextResponse.json({ customer, signupTicket: createSignupTicket(customer.email) }, { status: 201 });
}
