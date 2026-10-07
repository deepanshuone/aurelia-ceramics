import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "../auth";
import { prisma } from "./prisma";
import { isOwnerEmail } from "./owner";
import { type AccessLevel, type Area, accessForRole, allows } from "./permissions";

export { isOwnerEmail };

/**
 * Admin panel access levels, highest first.
 *   ADMIN  — everything, including Team & Access (staff roles).
 *   EDITOR / VIEWER — per-area access an admin sets on Team & Access
 *            (lib/permissions.ts). Defaults: Editors change orders and the
 *            catalogue, Viewers only look.
 */
export const STAFF_ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  VIEWER: "Viewer",
  CUSTOMER: "Customer",
};

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

const RANK: Record<StaffRole, number> = { VIEWER: 1, EDITOR: 2, ADMIN: 3 };

/**
 * Server-side gate for every admin page and server action.
 *
 * Middleware already blocks non-staff tokens, but a JWT keeps the role it was
 * issued with until it expires — so this re-checks the database to make
 * role changes and account blocks take effect immediately.
 */
async function requireStaffRole(minimum: StaffRole) {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login?callbackUrl=/admin");

  const staff = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!staff || !staff.isActive) redirect("/");
  // An owner listed in OWNER_EMAIL is always a full admin.
  const role: string = isOwnerEmail(staff.email) ? "ADMIN" : staff.role;
  if (!isStaffRole(role)) redirect("/");
  // Signed in, but below the level this page or action needs.
  if (RANK[role] < RANK[minimum]) redirect("/admin");

  return { ...staff, role };
}

/** Any staff member, with their per-area access: for the admin layout and dashboard. */
export async function requireStaff() {
  const staff = await requireStaffRole("VIEWER");
  return { ...staff, access: await accessForRole(staff.role) };
}

/** Full admin: Team & Access (staff roles). */
export const requireAdmin = () => requireStaffRole("ADMIN");

/**
 * Gate for an admin area: "view" for its pages, "edit" for actions that
 * change something. Uses the permissions an admin set on Team & Access.
 */
export async function requirePermission(area: Area, level: AccessLevel) {
  const staff = await requireStaff();
  if (!allows(staff.access[area], level)) redirect("/admin");
  return staff;
}

/** Result shape shared by admin forms using useActionState. */
export type ActionState = { error?: string; success?: string } | null;

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form.";
}

/** Empty form fields arrive as "", which should mean "not set". */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

export const money = (label: string) =>
  z.coerce
    .number({ message: `${label} must be a number.` })
    .nonnegative(`${label} can't be negative.`)
    .max(10_000_000, `${label} is too large.`)
    .transform((value) => Math.round(value * 100) / 100);

export const optionalMoney = (label: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return null;
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) {
        ctx.addIssue({ code: "custom", message: `${label} must be a positive number.` });
        return z.NEVER;
      }
      return Math.round(number * 100) / 100;
    });

// Unticked checkboxes are simply absent from the form data, so the field must
// be optional (a union containing z.undefined() isn't treated as optional).
export const checkbox = z
  .string()
  .nullish()
  .transform((value) => value === "on" || value === "true");

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const PAGE_SIZE = 20;

export function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Prisma unique-constraint violation (e.g. duplicate slug or code). */
export function isUniqueViolation(error: unknown, field?: string) {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  if ((error as { code: string }).code !== "P2002") return false;
  if (!field) return true;
  const target = (error as { meta?: { target?: string[] | string } }).meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? "").includes(field);
}
