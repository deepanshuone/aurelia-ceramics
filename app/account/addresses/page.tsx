import type { Metadata } from "next";
import { auth } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import AddressManager from "./AddressManager";

export const metadata: Metadata = {
  title: "My Addresses",
};

export default async function AddressesPage() {
  const session = await auth();

  const addresses = session?.user?.id
    ? await prisma.address.findMany({
        where: { customerId: session.user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      })
    : [];

  return (
    <main className="auth-page">
      <div className="auth-container account-container">
        <p className="section-label">MY ADDRESSES</p>

        <h1>
          Saved
          <br />
          <em>addresses.</em>
        </h1>

        <AddressManager
          initialAddresses={addresses.map((a) => ({
            id: a.id,
            label: a.label,
            address: a.address,
            city: a.city,
            state: a.state,
            pin: a.pin,
            isDefault: a.isDefault,
          }))}
        />
      </div>
    </main>
  );
}
