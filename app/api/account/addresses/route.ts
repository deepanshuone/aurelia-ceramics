import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";

const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  address: z.string().trim().min(5, "Please enter a valid address."),
  city: z.string().trim().min(2, "Please enter a valid city."),
  state: z.string().trim().min(2, "Please select a state."),
  pin: z.string().trim().regex(/^\d{6}$/, "Please enter a valid 6-digit PIN code."),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: { customerId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ addresses });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { label, address, city, state, pin, isDefault } = parsed.data;
  const customerId = session.user.id;

  const existingCount = await prisma.address.count({ where: { customerId } });
  const shouldBeDefault = isDefault || existingCount === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        customerId,
        label,
        address,
        city,
        state,
        pin,
        isDefault: shouldBeDefault,
      },
    });
  });

  return NextResponse.json({ address: created }, { status: 201 });
}
