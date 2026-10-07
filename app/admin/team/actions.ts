"use server";

import { z } from "zod";
import { type ActionState, firstIssue, requireAdmin } from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";
import { ASSIGNABLE_ROLES, assignRole } from "../../../lib/staff-access";

const grantSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter the email address of their Aurelia account."),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"], { message: "Choose an access level." }),
});

/** Gives an existing customer account access to the admin panel. */
export async function grantAccess(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = grantSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const target = await prisma.customer.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (!target) {
    return { error: "No account uses this email. Ask them to create an account on the website first, then add them here." };
  }

  return assignRole(admin.id, target.id, parsed.data.role);
}

const roleSchema = z.object({ role: z.enum(ASSIGNABLE_ROLES, { message: "Choose an access level." }) });

/** Changes a team member's access level, or removes it (back to Customer). */
export async function changeAccess(customerId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = roleSchema.safeParse({ role: formData.get("role") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  return assignRole(admin.id, customerId, parsed.data.role);
}
