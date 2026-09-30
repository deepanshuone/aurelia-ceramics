"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionState, requireAdmin } from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";

const updateSchema = z.object({
  intent: z.enum(["block", "unblock", "make-admin", "make-customer"]),
});

export async function updateCustomer(
  customerId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = updateSchema.safeParse({ intent: formData.get("intent") });
  if (!parsed.success) return { error: "Unknown action." };

  // Prevent an admin from locking themselves out.
  if (customerId === admin.id) {
    return { error: "You can't change your own role or block your own account." };
  }

  const data = {
    block: { isActive: false },
    unblock: { isActive: true },
    "make-admin": { role: "ADMIN" as const },
    "make-customer": { role: "CUSTOMER" as const },
  }[parsed.data.intent];

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data,
    select: { name: true },
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);

  const messages = {
    block: `${customer.name} is blocked and can no longer log in or place orders.`,
    unblock: `${customer.name} is unblocked.`,
    "make-admin": `${customer.name} is now an admin.`,
    "make-customer": `${customer.name} is no longer an admin.`,
  };
  return { success: messages[parsed.data.intent] };
}
