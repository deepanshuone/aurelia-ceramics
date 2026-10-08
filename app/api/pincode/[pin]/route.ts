import { NextResponse } from "next/server";
import { lookupPincode } from "../../../../lib/pincode";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";

// City and state for a PIN code, used to fill in the checkout address.
export async function GET(request: Request, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  if (!/^[1-9]\d{5}$/.test(pin)) {
    return NextResponse.json({ error: "Please enter a valid 6-digit PIN code." }, { status: 400 });
  }

  if (!rateLimit(`pincode:${clientIp(request.headers)}`, 60, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many lookups. Please fill in your city and state." }, { status: 429 });
  }

  const info = await lookupPincode(pin);
  if (info === "unavailable") {
    return NextResponse.json({ error: "Please fill in your city and state." }, { status: 503 });
  }
  if (!info) {
    return NextResponse.json({ error: "We couldn't find this PIN code. Please check it, or fill in your city and state." }, { status: 404 });
  }

  return NextResponse.json(info, { headers: { "Cache-Control": "public, max-age=86400" } });
}
