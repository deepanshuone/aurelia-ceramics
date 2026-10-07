"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionState, isOwnerEmail, requirePermission } from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";
import { ASSIGNABLE_ROLES, assignRole } from "../../../lib/staff-access";

const updateSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("block") }),
  z.object({ intent: z.literal("unblock") }),
  z.object({ intent: z.literal("role"), role: z.enum(ASSIGNABLE_ROLES) }),
]);

export async function updateCustomer(
  customerId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Blocking needs "edit" on Customers; changing roles is admin-only.
  const admin = await requirePermission("customers", "edit");

  const parsed = updateSchema.safeParse({
    intent: formData.get("intent"),
    role: formData.get("role") ?? undefined,
  });
  if (!parsed.success) return { error: "Unknown action." };

  const input = parsed.data;
  if (input.intent === "role") {
    if (admin.role !== "ADMIN") return { error: "Only admins can change roles." };
    return assignRole(admin.id, customerId, input.role);
  }

  // Prevent an admin from locking themselves out.
  if (customerId === admin.id) {
    return { error: "You can't change your own role or block your own account." };
  }

  const target = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true, role: true },
  });
  if (!target) return { error: "Customer not found." };
  // Non-admins may block shoppers only, never other staff.
  if (admin.role !== "ADMIN" && target.role !== "CUSTOMER") {
    return { error: "Only admins can block staff accounts." };
  }
  // The store owner (OWNER_EMAIL) can't be demoted or blocked by anyone.
  if (isOwnerEmail(target.email)) {
    return { error: "This is the store owner's account. Its role and status can't be changed." };
  }

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { isActive: input.intent === "unblock" },
    select: { name: true },
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);

  return {
    success:
      input.intent === "block"
        ? `${customer.name} is blocked and can no longer log in or place orders.`
        : `${customer.name} is unblocked.`,
  };
}
