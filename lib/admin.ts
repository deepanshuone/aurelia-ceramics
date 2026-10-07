import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "../auth";
import { prisma } from "./prisma";
import { isOwnerEmail } from "./owner";

export { isOwnerEmail };

/**
 * Admin panel access levels, highest first.
 *   ADMIN  — everything, including refunds, store settings and staff roles.
 *   EDITOR — orders (status, tracking, cancel) and the catalogue, coupons,
 *            enquiries and reviews. No refunds, roles or settings.
 *   VIEWER — can open every admin page but change nothing.
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

/** Any staff member (Viewer and up): for admin pages. */
export const requireStaff = () => requireStaffRole("VIEWER");
/** Editor and up: for actions that change orders, products and content. */
export const requireEditor = () => requireStaffRole("EDITOR");
/** Full admin: refunds, store settings and staff roles. */
export const requireAdmin = () => requireStaffRole("ADMIN");

export const canEdit = (role: string) => role === "ADMIN" || role === "EDITOR";

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
