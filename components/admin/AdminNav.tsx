"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/team", label: "Team & Access", adminOnly: true },
  { href: "/admin/settings", label: "Settings", adminOnly: true },
];

export default function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Admin">
      {LINKS.filter((link) => isAdmin || !link.adminOnly).map((link) => {
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
