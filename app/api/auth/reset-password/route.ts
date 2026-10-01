import { NextResponse, after } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";
import { verifyResetToken } from "../../../../lib/password-reset";
import { sendPasswordChangedEmail } from "../../../../lib/account-emails";

const schema = z.object({
  token: z.string().min(1).max(300),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password is too long."),
});

const INVALID = "This reset link is invalid or has expired. Please request a new one.";

export async function POST(request: Request) {
  const limit = rateLimit(`reset:ip:${clientIp(request.headers)}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const customer = await verifyResetToken(parsed.data.token);
  if (!customer) return NextResponse.json({ error: INVALID }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  // Conditional on the hash the token was signed with: if two requests race
  // with the same link, only one of them can win.
  const updated = await prisma.customer.updateMany({
    where: { id: customer.id, passwordHash: customer.passwordHash, isActive: true },
    data: { passwordHash },
  });
  if (updated.count === 0) return NextResponse.json({ error: INVALID }, { status: 400 });

  after(() => sendPasswordChangedEmail(customer).then(() => undefined));

  return NextResponse.json({ ok: true });
}
