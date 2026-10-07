"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionState, ROLE_LABELS, isOwnerEmail, requireAdmin } from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";

const updateSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("block") }),
  z.object({ intent: z.literal("unblock") }),
  z.object({ intent: z.literal("role"), role: z.enum(["ADMIN", "EDITOR", "VIEWER", "CUSTOMER"]) }),
]);

export async function updateCustomer(
  customerId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = updateSchema.safeParse({
    intent: formData.get("intent"),
    role: formData.get("role") ?? undefined,
  });
  if (!parsed.success) return { error: "Unknown action." };

  // Prevent an admin from locking themselves out.
  if (customerId === admin.id) {
    return { error: "You can't change your own role or block your own account." };
  }

  const target = await prisma.customer.findUnique({ where: { id: customerId }, select: { email: true } });
  if (!target) return { error: "Customer not found." };
  // The store owner (OWNER_EMAIL) can't be demoted or blocked by anyone.
  if (isOwnerEmail(target.email)) {
    return { error: "This is the store owner's account. Its role and status can't be changed." };
  }

  const input = parsed.data;
  const data =
    input.intent === "role"
      ? { role: input.role }
      : { isActive: input.intent === "unblock" };

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data,
    select: { name: true },
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);

  if (input.intent === "role") {
    return {
      success:
        input.role === "CUSTOMER"
          ? `${customer.name} no longer has admin panel access.`
          : `${customer.name} is now ${input.role === "ADMIN" ? "an" : "a"} ${ROLE_LABELS[input.role]}.`,
    };
  }
  return {
    success:
      input.intent === "block"
        ? `${customer.name} is blocked and can no longer log in or place orders.`
        : `${customer.name} is unblocked.`,
  };
}
