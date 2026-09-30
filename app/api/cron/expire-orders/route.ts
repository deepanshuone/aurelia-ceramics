import { NextResponse } from "next/server";
import { expireStaleOrders } from "../../../../lib/payments";

// Backup sweep for unpaid orders (the main sweep runs lazily on checkout and
// order pages). Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await expireStaleOrders();
  return NextResponse.json({ expired });
}
