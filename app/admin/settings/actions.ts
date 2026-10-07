"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionState, firstIssue, requireAdmin } from "../../../lib/admin";
import { MAX_PROCESSING_DAYS } from "../../../lib/processing";
import { prisma } from "../../../lib/prisma";

const settingsSchema = z.object({
  processingDays: z.coerce
    .number({ message: "Enter the processing time in days." })
    .int("Processing time must be a whole number of days.")
    .min(0, "Processing time can't be negative.")
    .max(MAX_PROCESSING_DAYS, `Processing time can be at most ${MAX_PROCESSING_DAYS} days.`),
});

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({ processingDays: formData.get("processingDays") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await prisma.storeSetting.upsert({
    where: { id: "store" },
    create: { id: "store", processingDays: parsed.data.processingDays },
    update: { processingDays: parsed.data.processingDays },
  });

  // Every order page that falls back to the store value shows the new time.
  revalidatePath("/admin", "layout");
  revalidatePath("/account/orders", "layout");
  return { success: "Settings saved. Orders without their own processing time now use this value." };
}
