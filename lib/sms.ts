// Sends sign-up OTPs by SMS through MSG91's OTP API.
//
// Needs MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID (a DLT-approved OTP template
// containing the ##OTP## variable). Until both are set, phone verification is
// switched off and sign-up works without an OTP.

export function isSmsConfigured() {
  return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_TEMPLATE_ID);
}

/** Sends `code` to a 10-digit Indian mobile number. Returns false if the provider refused it. */
export async function sendOtpSms(phone: string, code: string) {
  const params = new URLSearchParams({
    template_id: process.env.MSG91_OTP_TEMPLATE_ID ?? "",
    mobile: `91${phone}`,
    otp: code,
  });

  try {
    const res = await fetch(`https://control.msg91.com/api/v5/otp?${params}`, {
      method: "POST",
      headers: { authkey: process.env.MSG91_AUTH_KEY ?? "", accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => null)) as { type?: string; message?: string } | null;
    if (!res.ok || data?.type !== "success") {
      console.error("MSG91 OTP send failed", res.status, data?.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("MSG91 OTP send failed", error);
    return false;
  }
}
