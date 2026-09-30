import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { prisma } from "../../lib/prisma";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Checkout",
};

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/checkout");
  }

  const customer = await prisma.customer.findUnique({
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
  });

  if (!customer) {
    redirect("/login?callbackUrl=/checkout");
  }

  return (
    <CheckoutForm
      contact={{ name: customer.name, phone: customer.phone, email: customer.email }}
      addresses={customer.addresses}
    />
  );
}
