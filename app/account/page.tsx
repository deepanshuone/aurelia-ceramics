import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "../../auth";
import { isOwnerEmail, isStaffRole } from "../../lib/admin";
import { prisma } from "../../lib/prisma";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = {
  title: "My Account",
};

export default async function AccountPage() {
  const session = await auth();
  // Read the role from the database so newly given access shows straight away.
  const me = session?.user?.id
    ? await prisma.customer.findUnique({ where: { id: session.user.id }, select: { role: true, email: true } })
    : null;
  const hasAdminAccess = !!me && (isOwnerEmail(me.email) || isStaffRole(me.role));

  return (
    <main className="auth-page">
      <div className="auth-container account-container">
        <p className="section-label">MY ACCOUNT</p>

        <h1>
          Hello,
          <br />
          <em>{session?.user?.name?.split(" ")[0] ?? "there"}.</em>
        </h1>

        <div className="account-profile-card">
          <div className="account-profile-row">
            <span>Name</span>
            <strong>{session?.user?.name}</strong>
          </div>
          <div className="account-profile-row">
            <span>Email</span>
            <strong>{session?.user?.email}</strong>
          </div>
        </div>

        <div className="account-links">
          <Link href="/account/orders" className="account-link-card">
            <span>My Orders</span>
            <p>Track and view your order history</p>
          </Link>

          <Link href="/account/addresses" className="account-link-card">
            <span>My Addresses</span>
            <p>Manage your saved delivery addresses</p>
          </Link>

          {hasAdminAccess && (
            <Link href="/admin" className="account-link-card">
              <span>Admin Panel</span>
              <p>Manage orders, products, customers and coupons</p>
            </Link>
          )}
        </div>

        <LogoutButton />
      </div>
    </main>
  );
}
