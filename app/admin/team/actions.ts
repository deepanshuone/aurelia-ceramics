"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionState, firstIssue, requireAdmin } from "../../../lib/admin";
import { AREAS, CONFIGURABLE_ROLES, DEFAULT_PERMISSIONS, parsePermissions } from "../../../lib/permissions";
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

export type AccountSuggestion = { id: string; name: string; email: string; role: string };

/** Accounts matching a name or email, for the "Give someone access" email box. */
export async function suggestAccounts(query: string): Promise<AccountSuggestion[]> {
  await requireAdmin();

  const q = String(query ?? "").trim().slice(0, 80);
  if (q.length < 2) return [];

  return prisma.customer.findMany({
    where: {
      isActive: true,
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ lastLoginAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 8,
    select: { id: true, name: true, email: true, role: true },
  });
}

/** Saves what Editors and Viewers may see or change in each admin area. */
export async function savePermissions(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const reset = formData.get("intent") === "reset";
  const submitted = Object.fromEntries(
    CONFIGURABLE_ROLES.map((role) => [
      role,
      Object.fromEntries(AREAS.map((area) => [area, formData.get(`${role}.${area}`)])),
    ])
  );
  // Unknown values fall back to the defaults rather than failing the save.
  const permissions = reset ? DEFAULT_PERMISSIONS : parsePermissions(submitted);

  await prisma.storeSetting.upsert({
    where: { id: "store" },
    create: { id: "store", rolePermissions: permissions },
    update: { rolePermissions: permissions },
  });

  revalidatePath("/admin", "layout");
  return {
    success: reset
      ? "Permissions reset to the defaults."
      : "Permissions saved. Editors and Viewers get the new access on their next click.",
  };
}
