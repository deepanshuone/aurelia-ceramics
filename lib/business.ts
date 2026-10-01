import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from "./cart";

// Business details shown in the footer, contact page and policy pages.
// Edit these in ONE place. Razorpay (and Indian e-commerce rules) expect a
// real registered name, address, email and phone on the site before going live.
//
// TODO(owner): replace every value marked PLACEHOLDER.

export const BUSINESS = {
  /** Brand name shown to customers. */
  brand: "AURELIA Ceramics",
  /** Registered legal name of the business (proprietorship / LLP / Pvt Ltd). PLACEHOLDER */
  legalName: "Aurelia Ceramics",
  email: "hello@aureliaceramics.in", // PLACEHOLDER — use an inbox you actually monitor
  phone: "+91 00000 00000", // PLACEHOLDER
  /**
   * WhatsApp Business number: country code + number, digits only
   * (e.g. "919876543210"). Leave empty to hide every WhatsApp button.
   */
  whatsapp: "", // PLACEHOLDER
  /** Registered / pickup address. PLACEHOLDER */
  address: "Morbi, Gujarat, India",
  /** GSTIN, if registered. Leave empty to hide it. PLACEHOLDER */
  gstin: "",
  /** Courts for dispute resolution in the Terms. */
  jurisdiction: "Morbi, Gujarat",
  /** Customer support hours. */
  supportHours: "Monday to Saturday, 10:00 am – 6:00 pm IST",
  /** Date the policy pages were last reviewed (shown on each policy). */
  policiesUpdated: "30 September 2026",
} as const;

/** wa.me link with a pre-filled message, or null when no WhatsApp number is set. */
export function whatsappLink(message: string) {
  const number = BUSINESS.whatsapp.replace(/\D/g, "");
  if (number.length < 10) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// Commercial terms the policy pages describe. Delivery charges come straight
// from the cart code; the online-payment window is PAYMENT_WINDOW_MINUTES in
// lib/payments.ts. The rest are operational promises — adjust to what you can meet.
export const POLICY = {
  freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
  deliveryFee: DELIVERY_FEE,
  dispatchDays: "1–3 business days",
  deliveryDays: "3–8 business days",
  damageReportHours: 48,
  returnDays: 7,
  refundDays: "5–7 business days",
} as const;
