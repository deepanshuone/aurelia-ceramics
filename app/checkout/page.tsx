import type { Metadata } from "next";
import { auth } from "../../auth";
import { prisma } from "../../lib/prisma";
import { estimateDelivery, formatDeliveryEstimate } from "../../lib/delivery-estimate";
import { getStoreProcessingDays } from "../../lib/store-settings";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Checkout",
};

export default async function CheckoutPage() {
  const session = await auth();
  const deliveryEstimate = formatDeliveryEstimate(estimateDelivery(await getStoreProcessingDays()));

  // Signed in: prefill contact details and saved addresses.
  const customer = session?.user?.id
    ? await prisma.customer.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          phone: true,
          email: true,
          addresses: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
            select: { id: true, label: true, address: true, city: true, state: true, pin: true },
          },
        },
      })
    : null;

  // Anyone else checks out as a guest.
  return (
    <CheckoutForm
      contact={customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null}
      addresses={customer?.addresses ?? []}
      deliveryEstimate={deliveryEstimate}
    />
  );
}
