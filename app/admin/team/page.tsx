import type { Metadata } from "next";
import Link from "next/link";
import { ROLE_LABELS, STAFF_ROLES, isOwnerEmail, requireAdmin } from "../../../lib/admin";
import { formatOrderDate } from "../../../lib/order-display";
import { ownerEmails } from "../../../lib/owner";
import { prisma } from "../../../lib/prisma";
import { AREAS, AREA_INFO, getRolePermissions } from "../../../lib/permissions";
import { GrantAccessForm, MemberAccessForm, PermissionsForm } from "./TeamForms";

export const metadata: Metadata = { title: "Team & Access" };

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
        <p className="admin-hint team-hint">
          To change someone&apos;s level, pick a new one and press Update. To take admin access away, choose
          &quot;Customer&quot; or press Remove access: they go back to being a normal customer.
        </p>
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
        <p className="admin-hint team-hint">
          Choose what Editors and Viewers can see or change. Admins always have full access, and only admins can
          open Team &amp; Access, so nobody can give themselves more access.
        </p>
        <PermissionsForm
          areas={AREAS.map((area) => ({ area, label: AREA_INFO[area].label, detail: AREA_INFO[area].detail }))}
          permissions={await getRolePermissions()}
        />
        <p className="admin-hint team-hint">Customers have no admin panel access; they only shop and see their own orders.</p>
      </section>
    </>
  );
}
