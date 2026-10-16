import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";

// Ends every login of this account, on every device, including any copied
// login cookie (checked in auth.ts). The browser then signs itself out.
export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.customer.update({
    where: { id: session.user.id },
    data: { sessionsRevokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
