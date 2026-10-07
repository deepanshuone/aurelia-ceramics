"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminLink = { href: string; label: string; readOnly: boolean };

function isActive(href: string, pathname: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Sidebar links: only the areas this staff member may open. */
export default function AdminNav({ links }: { links: AdminLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Admin">
      {links.map((link) => {
        const active = isActive(link.href, pathname);
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

/**
 * Shows the current page read-only when this staff member only has view
 * access to its area. Cosmetic: the server actions reject changes regardless.
 */
export function AdminShell({
  links,
  sidebar,
  children,
}: {
  links: AdminLink[];
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = links.find((link) => link.href !== "/admin" && isActive(link.href, pathname));
  const readOnly = current?.readOnly ?? false;

  return (
    <div className={`admin-shell${readOnly ? " admin-readonly" : ""}`}>
      <aside className="admin-sidebar">{sidebar}</aside>
      <div className="admin-main">
        {readOnly && (
          <p className="admin-panel admin-readonly-note">View-only access: you can look around, but not change anything here.</p>
        )}
        {children}
      </div>
    </div>
  );
}
