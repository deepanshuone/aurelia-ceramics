"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionState, firstIssue, optionalText, requirePermission } from "../../../lib/admin";
import { prisma } from "../../../lib/prisma";

const updateSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "CLOSED"], { message: "Choose a status." }),
  adminNote: optionalText(1000),
});

export async function updateEnquiry(
  enquiryId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermission("enquiries", "edit");

  const parsed = updateSchema.safeParse({
    status: formData.get("status"),
    adminNote: formData.get("adminNote") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await prisma.enquiry.update({ where: { id: enquiryId }, data: parsed.data });

  revalidatePath("/admin");
  revalidatePath("/admin/enquiries");
  return { success: "Saved." };
}

export async function deleteEnquiry(enquiryId: string): Promise<ActionState> {
  await requirePermission("enquiries", "edit");
  await prisma.enquiry.deleteMany({ where: { id: enquiryId } });
  revalidatePath("/admin");
  revalidatePath("/admin/enquiries");
  return { success: "Deleted." };
}
