import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { ENQUIRY_REQUIREMENTS } from "../../../lib/enquiries";
import { clientIp, rateLimit } from "../../../lib/rate-limit";

const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || /^[+\d][\d\s-]{7,18}$/.test(value), "Please enter a valid phone number."),
  requirement: z.enum(ENQUIRY_REQUIREMENTS, { message: "Please choose what your enquiry is about." }),
  message: z.string().trim().min(10, "Please tell us a little more (at least 10 characters).").max(3000),
  // Honeypot: hidden from people, so only bots fill it in.
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const limit = rateLimit(`contact:${clientIp(request.headers)}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "You've sent several enquiries already. Please try again later or email us directly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    // Pretend success to bots that filled the honeypot so they don't adapt.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  }

  const { name, email, phone, requirement, message } = parsed.data;
  await prisma.enquiry.create({ data: { name, email, phone, requirement, message } });

  return NextResponse.json({ ok: true }, { status: 201 });
}
