import type { Metadata } from "next";
import { ROLE_LABELS, requireStaff } from "../../lib/admin";
import AdminNav from "../../components/admin/AdminNav";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireStaff();

  return (
    // Viewers see every page, but forms are shown read-only (the server
    // actions reject them regardless).
    <div className={`admin-shell${admin.role === "VIEWER" ? " admin-readonly" : ""}`}>
      <aside className="admin-sidebar">
        <p className="admin-sidebar-title">AURELIA ADMIN</p>
        <AdminNav />
        <p className="admin-sidebar-user">
          Signed in as
          <br />
          <strong>{admin.name}</strong>
          <br />
          {ROLE_LABELS[admin.role]}
        </p>
      </aside>

      <div className="admin-main">
        {admin.role === "VIEWER" && (
          <p className="admin-panel admin-readonly-note">View-only access: you can look around, but not change anything.</p>
        )}
        {children}
      </div>
    </div>
  );
}
