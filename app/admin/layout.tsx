import type { Metadata } from "next";
import { ROLE_LABELS, requireStaff } from "../../lib/admin";
import { AREAS, AREA_INFO } from "../../lib/permissions";
import AdminNav, { type AdminLink, AdminShell } from "../../components/admin/AdminNav";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireStaff();

  // Areas the admin turned off for this role are hidden; view-only ones are
  // shown read-only (pages and actions check the same permissions).
  const links: AdminLink[] = [
    { href: "/admin", label: "Dashboard", readOnly: false },
    ...AREAS.flatMap((area) => {
      const { path, label } = AREA_INFO[area];
      const level = admin.access[area];
      return path && level !== "none" ? [{ href: path, label, readOnly: level === "view" }] : [];
    }),
    ...(admin.role === "ADMIN" ? [{ href: "/admin/team", label: "Team & Access", readOnly: false }] : []),
  ];

  return (
    <AdminShell
      links={links}
      sidebar={
        <>
          <p className="admin-sidebar-title">AURELIA ADMIN</p>
          <AdminNav links={links} />
          <p className="admin-sidebar-user">
            Signed in as
            <br />
            <strong>{admin.name}</strong>
            <br />
            {ROLE_LABELS[admin.role]}
          </p>
        </>
      }
    >
      {children}
    </AdminShell>
  );
}
