"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  type ActionState,
  checkbox,
  firstIssue,
  isUniqueViolation,
  money,
  optionalMoney,
  optionalText,
  requireAdmin,
} from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "Code must be at least 3 characters.")
      .max(40)
      .regex(/^[A-Z0-9_-]+$/, "Code may only contain letters, numbers, dashes and underscores."),
    description: optionalText(200),
    discountType: z.enum(["PERCENTAGE", "FIXED"], { message: "Choose a discount type." }),
    discountValue: money("Discount").refine((value) => value > 0, "Discount must be more than zero."),
    minOrderValue: optionalMoney("Minimum order"),
    maxDiscount: optionalMoney("Maximum discount"),
    usageLimit: z
      .string()
      .trim()
      .transform((value, ctx) => {
        if (!value) return null;
        const number = Number(value);
        if (!Number.isInteger(number) || number < 1) {
          ctx.addIssue({ code: "custom", message: "Usage limit must be a whole number of at least 1." });
          return z.NEVER;
        }
        return number;
      }),
    expiresAt: z
      .string()
      .trim()
      .transform((value, ctx) => {
        if (!value) return null;
        // Date inputs give YYYY-MM-DD; the coupon stays valid through that
        // whole day in India.
        const date = new Date(`${value}T23:59:59+05:30`);
        if (Number.isNaN(date.getTime())) {
          ctx.addIssue({ code: "custom", message: "Enter a valid expiry date." });
          return z.NEVER;
        }
        return date;
      }),
    isActive: checkbox,
  })
  .refine((data) => data.discountType !== "PERCENTAGE" || data.discountValue <= 100, {
    message: "A percentage discount can't be more than 100%.",
  });

function refresh(couponId?: string) {
  revalidatePath("/admin/coupons");
  if (couponId) revalidatePath(`/admin/coupons/${couponId}`);
}

export async function saveCoupon(
  couponId: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = couponSchema.safeParse({
    code: formData.get("code") ?? "",
    description: formData.get("description") ?? "",
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    minOrderValue: formData.get("minOrderValue") ?? "",
    maxDiscount: formData.get("maxDiscount") ?? "",
    usageLimit: formData.get("usageLimit") ?? "",
    expiresAt: formData.get("expiresAt") ?? "",
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  let savedId: string;
  try {
    if (couponId) {
      await prisma.coupon.update({ where: { id: couponId }, data: parsed.data });
      savedId = couponId;
    } else {
      const created = await prisma.coupon.create({ data: parsed.data, select: { id: true } });
      savedId = created.id;
    }
  } catch (error) {
    if (isUniqueViolation(error, "code")) return { error: `A coupon with the code ${parsed.data.code} already exists.` };
    throw error;
  }

  refresh(savedId);
  if (!couponId) redirect(`/admin/coupons/${savedId}?created=1`);
  return { success: "Coupon saved." };
}

export async function deleteCoupon(couponId: string): Promise<ActionState> {
  await requireAdmin();

  const used = await prisma.order.count({ where: { couponId } });
  if (used > 0) {
    return { error: "This coupon has been used on orders, so it can't be deleted. Untick “Active” to switch it off." };
  }

  await prisma.coupon.delete({ where: { id: couponId } });
  refresh();
  redirect("/admin/coupons");
}
