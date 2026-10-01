import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";
import { sendPasswordResetEmail } from "../../../../lib/account-emails";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200),
});

const HOUR = 60 * 60 * 1000;

// The reply is identical whether or not the email has an account, so this form
// can't be used to find out who is registered.
const GENERIC = {
  ok: true,
  message: "If an account exists for that email, we've sent a link to reset the password. It is valid for 60 minutes.",
};

export async function POST(request: Request) {
  const byIp = rateLimit(`forgot:ip:${clientIp(request.headers)}`, 8, HOUR);
  if (!byIp.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfter) } }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please enter a valid email address." }, { status: 400 });
  }
  const { email } = parsed.data;

  // Stops someone mail-bombing one inbox; still answers generically.
  if (!rateLimit(`forgot:email:${email}`, 3, HOUR).allowed) return NextResponse.json(GENERIC);

  const customer = await prisma.customer.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true, isActive: true },
  });

  if (customer?.isActive && customer.passwordHash) {
    const recipient = { id: customer.id, name: customer.name, email: customer.email, passwordHash: customer.passwordHash };
    // After the response, so response time doesn't reveal whether the account exists.
    after(() => sendPasswordResetEmail(recipient).then(() => undefined));
  }

  return NextResponse.json(GENERIC);
}
