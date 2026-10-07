import { revalidatePath } from "next/cache";
import { ROLE_LABELS, isOwnerEmail, type ActionState } from "./admin";
import { prisma } from "./prisma";

export const ASSIGNABLE_ROLES = ["ADMIN", "EDITOR", "VIEWER", "CUSTOMER"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/**
 * Changes a customer's role on behalf of `adminId`. Shared by the customer
 * page and Team & Access so both enforce the same rules: nobody changes their
 * own role, and the store owner (OWNER_EMAIL) can't be changed at all.
 */
export async function assignRole(adminId: string, targetId: string, role: AssignableRole): Promise<ActionState> {
  if (targetId === adminId) return { error: "You can't change your own role." };

  const target = await prisma.customer.findUnique({
    where: { id: targetId },
    select: { name: true, email: true, role: true },
  });
  if (!target) return { error: "Account not found." };
  if (isOwnerEmail(target.email)) {
    return { error: "This is the store owner's account. Its role and status can't be changed." };
  }
  if (target.role === role) return { success: `${target.name} is already ${describe(role)}.` };

  await prisma.customer.update({ where: { id: targetId }, data: { role } });

  revalidatePath("/admin/team");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${targetId}`);

  return {
    success:
      role === "CUSTOMER"
        ? `${target.name} no longer has admin panel access.`
        : `${target.name} is now ${describe(role)}.`,
  };
}

function describe(role: AssignableRole) {
  if (role === "CUSTOMER") return "a Customer";
  return `${role === "VIEWER" ? "a" : "an"} ${ROLE_LABELS[role]}`;
}
