import { z } from "zod";
import { prisma } from "./prisma";

/**
 * Per-area access for Editors and Viewers, set by admins on Team & Access.
 * Admins (and the owner) always have full access; Team & Access itself is
 * admin-only and not configurable, so nobody can grant themselves more.
 */
export const ACCESS_LEVELS = ["none", "view", "edit"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const AREAS = [
  "orders",
  "refunds",
  "products",
  "categories",
  "customers",
  "coupons",
  "reviews",
  "enquiries",
  "settings",
] as const;
export type Area = (typeof AREAS)[number];

export type ConfigurableRole = "EDITOR" | "VIEWER";
export const CONFIGURABLE_ROLES: ConfigurableRole[] = ["EDITOR", "VIEWER"];

export type AreaAccess = Record<Area, AccessLevel>;
export type RolePermissions = Record<ConfigurableRole, AreaAccess>;

export const AREA_INFO: Record<Area, { label: string; detail: string; path?: string; actionOnly?: boolean }> = {
  orders: { label: "Orders", detail: "Status, tracking, cancel, processing days", path: "/admin/orders" },
  refunds: { label: "Refunds", detail: "Refund paid orders (also needs Orders: Can edit)", actionOnly: true },
  products: { label: "Products", detail: "Add, delete, edit price, stock, name", path: "/admin/products" },
  categories: { label: "Categories", detail: "Add, rename, delete", path: "/admin/categories" },
  customers: { label: "Customers", detail: "See details; edit = block or unblock customers", path: "/admin/customers" },
  coupons: { label: "Coupons", detail: "Create, change, delete", path: "/admin/coupons" },
  reviews: { label: "Reviews", detail: "Delete reviews", path: "/admin/reviews" },
  enquiries: { label: "Enquiries", detail: "Reply status, notes, delete", path: "/admin/enquiries" },
  settings: { label: "Store settings", detail: "Processing days, delivery charges", path: "/admin/settings" },
};

/** Same access each role had before permissions became editable. */
export const DEFAULT_PERMISSIONS: RolePermissions = {
  EDITOR: {
    orders: "edit",
    refunds: "none",
    products: "edit",
    categories: "edit",
    customers: "view",
    coupons: "edit",
    reviews: "edit",
    enquiries: "edit",
    settings: "none",
  },
  VIEWER: {
    orders: "view",
    refunds: "none",
    products: "view",
    categories: "view",
    customers: "view",
    coupons: "view",
    reviews: "view",
    enquiries: "view",
    settings: "none",
  },
};

export const FULL_ACCESS = Object.fromEntries(AREAS.map((area) => [area, "edit"])) as AreaAccess;

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2 };

export const allows = (have: AccessLevel, need: AccessLevel) => RANK[have] >= RANK[need];

/** Refunds is a single action: anything but "none" means allowed. */
function normalise(area: Area, level: AccessLevel): AccessLevel {
  return area === "refunds" && level !== "none" ? "edit" : level;
}

const levelSchema = z.enum(ACCESS_LEVELS);

/** Merges stored JSON over the defaults, ignoring anything malformed. */
export function parsePermissions(stored: unknown): RolePermissions {
  const result: RolePermissions = {
    EDITOR: { ...DEFAULT_PERMISSIONS.EDITOR },
    VIEWER: { ...DEFAULT_PERMISSIONS.VIEWER },
  };
  if (typeof stored !== "object" || stored === null) return result;
  for (const role of CONFIGURABLE_ROLES) {
    const areas = (stored as Record<string, unknown>)[role];
    if (typeof areas !== "object" || areas === null) continue;
    for (const area of AREAS) {
      const level = levelSchema.safeParse((areas as Record<string, unknown>)[area]);
      if (level.success) result[role][area] = normalise(area, level.data);
    }
  }
  return result;
}

/** Read straight from the database (not cached) so changes apply at once. */
export async function getRolePermissions(): Promise<RolePermissions> {
  const setting = await prisma.storeSetting.findUnique({
    where: { id: "store" },
    select: { rolePermissions: true },
  });
  return parsePermissions(setting?.rolePermissions);
}

/** The access a staff role has: admins always get everything. */
export async function accessForRole(role: string): Promise<AreaAccess> {
  if (role === "ADMIN") return FULL_ACCESS;
  if (role !== "EDITOR" && role !== "VIEWER") {
    return Object.fromEntries(AREAS.map((area) => [area, "none"])) as AreaAccess;
  }
  return (await getRolePermissions())[role];
}
