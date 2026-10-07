import type { Metadata } from "next";
import Link from "next/link";
import { ROLE_LABELS, STAFF_ROLES, isOwnerEmail, requireAdmin } from "../../../lib/admin";
import { formatOrderDate } from "../../../lib/order-display";
import { ownerEmails } from "../../../lib/owner";
import { prisma } from "../../../lib/prisma";
import { GrantAccessForm, MemberAccessForm } from "./TeamForms";

export const metadata: Metadata = { title: "Team & Access" };

// What each access level can do. Keep in sync with requireStaff /
// requireEditor / requireAdmin in lib/admin.ts.
const PERMISSIONS: { area: string; admin: string; editor: string; viewer: string }[] = [
  { area: "Dashboard & reports", admin: "full", editor: "view", viewer: "view" },
  { area: "Products: add, edit price, stock, name, delete", admin: "full", editor: "full", viewer: "view" },
  { area: "Categories", admin: "full", editor: "full", viewer: "view" },
  { area: "Orders: status, tracking, cancel, processing days", admin: "full", editor: "full", viewer: "view" },
  { area: "Refunds", admin: "full", editor: "none", viewer: "none" },
  { area: "Coupons", admin: "full", editor: "full", viewer: "view" },
  { area: "Reviews & enquiries", admin: "full", editor: "full", viewer: "view" },
  { area: "Customers: view details", admin: "full", editor: "view", viewer: "view" },
  { area: "Block customers", admin: "full", editor: "none", viewer: "none" },
  { area: "Store settings", admin: "full", editor: "none", viewer: "none" },
  { area: "Team & Access: give or remove access", admin: "full", editor: "none", viewer: "none" },
];

const CELL: Record<string, { label: string; className: string }> = {
  full: { label: "Can edit", className: "perm full" },
  view: { label: "View only", className: "perm view" },
  none: { label: "No access", className: "perm none" },
};

export default async function TeamPage() {
  const me = await requireAdmin();

  const owners = ownerEmails();
  const members = await prisma.customer.findMany({
    where: { OR: [{ role: { in: [...STAFF_ROLES] } }, ...(owners.length ? [{ email: { in: owners } }] : [])] },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true },
  });

  const rank = (member: (typeof members)[number]) =>
    isOwnerEmail(member.email) ? 0 : { ADMIN: 1, EDITOR: 2, VIEWER: 3 }[member.role as string] ?? 4;
  members.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  const counts = { ADMIN: 0, EDITOR: 0, VIEWER: 0 } as Record<string, number>;
  for (const member of members) counts[isOwnerEmail(member.email) ? "ADMIN" : member.role] += 1;

  return (
    <>
      <header className="admin-header">
        <h1>Team & Access</h1>
        <span className="admin-count">
          {counts.ADMIN} admin · {counts.EDITOR} editor · {counts.VIEWER} viewer
        </span>
      </header>

      <section className="admin-panel">
        <h2>Give someone access</h2>
        <p className="admin-hint team-hint">
          They need an account on the website first (they sign up like a customer). Start typing their name or email, pick them from the list, then choose
          what they can do.
        </p>
        <GrantAccessForm />
      </section>

      <section className="admin-panel">
        <h2>People with access</h2>
        {members.length === 0 ? (
          <p className="admin-empty">Nobody has admin access yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table team-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Access</th>
                  <th>Last login</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const owner = isOwnerEmail(member.email);
                  const role = owner ? "ADMIN" : member.role;
                  return (
                    <tr key={member.id}>
                      <td>
                        <Link href={`/admin/customers/${member.id}`}>{member.name}</Link>
                        <small>{member.email}</small>
                      </td>
                      <td>
                        <span className={`role-chip role-${role.toLowerCase()}`}>{owner ? "Owner" : ROLE_LABELS[role]}</span>
                        {!member.isActive && <span className="admin-badge off">Blocked</span>}
                      </td>
                      <td>{member.lastLoginAt ? formatOrderDate(member.lastLoginAt) : "Never"}</td>
                      <td>
                        {owner ? (
                          <span className="admin-hint">Store owner, can&apos;t be changed</span>
                        ) : member.id === me.id ? (
                          <span className="admin-hint">You</span>
                        ) : (
                          <MemberAccessForm customerId={member.id} role={member.role} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>What each level can do</h2>
        <div className="admin-table-wrap">
          <table className="admin-table perm-table">
            <thead>
              <tr>
                <th>Area</th>
                <th>Admin</th>
                <th>Editor</th>
                <th>Viewer</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((row) => (
                <tr key={row.area}>
                  <td>{row.area}</td>
                  {[row.admin, row.editor, row.viewer].map((level, i) => (
                    <td key={i}>
                      <span className={CELL[level].className}>{CELL[level].label}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="admin-hint team-hint">Customers have no admin panel access; they only shop and see their own orders.</p>
      </section>
    </>
  );
}
