import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "../auth";
import { prisma } from "./prisma";

/**
 * Server-side admin gate for every admin page and server action.
 *
 * Middleware already blocks non-admin tokens, but a JWT keeps the role it was
 * issued with until it expires — so this re-checks the database to make
 * demotions and account blocks take effect immediately.
 */
export async function requireAdmin() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login?callbackUrl=/admin");

  const admin = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!admin || admin.role !== "ADMIN" || !admin.isActive) redirect("/");
  return admin;
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
