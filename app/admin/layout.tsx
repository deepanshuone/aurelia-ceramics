import type { Metadata } from "next";
import { requireAdmin } from "../../lib/admin";
import AdminNav from "../../components/admin/AdminNav";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <p className="admin-sidebar-title">AURELIA ADMIN</p>
        <AdminNav />
        <p className="admin-sidebar-user">
          Signed in as
          <br />
          <strong>{admin.name}</strong>
        </p>
      </aside>

      <div className="admin-main">{children}</div>
    </div>
  );
}
