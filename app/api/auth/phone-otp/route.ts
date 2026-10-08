import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";
import { clearPhoneOtp, createPhoneOtp, isPhoneTaken, PHONE_PATTERN } from "../../../../lib/phone-otp";
import { isSmsConfigured, sendOtpSms } from "../../../../lib/sms";
import { CAPTCHA_ERROR, verifyCaptcha } from "../../../../lib/captcha";

const schema = z.object({
  phone: z.string().trim().regex(PHONE_PATTERN, "Please enter a valid 10-digit mobile number."),
  captchaToken: z.string().optional(),
});

// Sends a sign-up OTP to a mobile number that isn't registered yet.
export async function POST(request: Request) {
  if (!isSmsConfigured()) {
    return NextResponse.json({ error: "Mobile verification is not available right now." }, { status: 503 });
  }

  const ip = clientIp(request.headers);
  const ipLimit = rateLimit(`otp-ip:${ip}`, 10, 60 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many OTP requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { phone, captchaToken } = parsed.data;

  // Each OTP is a paid SMS, so bots must not be able to trigger them.
  if (!(await verifyCaptcha(captchaToken, ip))) {
    return NextResponse.json({ error: CAPTCHA_ERROR }, { status: 400 });
  }

  const phoneLimit = rateLimit(`otp-phone:${phone}`, 5, 60 * 60 * 1000);
  if (!phoneLimit.allowed) {
    return NextResponse.json(
      { error: "Too many OTPs sent to this number. Please try again later." },
      { status: 429, headers: { "Retry-After": String(phoneLimit.retryAfter) } }
    );
  }

  if (await isPhoneTaken(phone)) {
    return NextResponse.json({ error: "An account with this mobile number already exists. Please sign in." }, { status: 409 });
  }

  const code = await createPhoneOtp(phone);
  if (!code) {
    return NextResponse.json({ error: "Please wait a minute before requesting another OTP." }, { status: 429 });
  }

  if (!(await sendOtpSms(phone, code))) {
    // Nothing reached the customer, so let them try again straight away.
    await clearPhoneOtp(phone);
    return NextResponse.json({ error: "We couldn't send the OTP. Please check the number and try again." }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
