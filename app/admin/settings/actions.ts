"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { type ActionState, firstIssue, requirePermission } from "../../../lib/admin";
import { MAX_PROCESSING_DAYS } from "../../../lib/processing";
import { prisma } from "../../../lib/prisma";
import { STORE_SETTINGS_TAG } from "../../../lib/store-settings";

const MAX_RUPEES = 1_000_000;

const settingsSchema = z.object({
  processingDays: z.coerce
    .number({ message: "Enter the processing time in days." })
    .int("Processing time must be a whole number of days.")
    .min(0, "Processing time can't be negative.")
    .max(MAX_PROCESSING_DAYS, `Processing time can be at most ${MAX_PROCESSING_DAYS} days.`),
  freeDeliveryThreshold: z.coerce
    .number({ message: "Enter the free delivery amount in rupees." })
    .int("Free delivery amount must be in whole rupees.")
    .min(0, "Free delivery amount can't be negative.")
    .max(MAX_RUPEES, "Free delivery amount is too large."),
  deliveryFee: z.coerce
    .number({ message: "Enter the delivery charge in rupees." })
    .int("Delivery charge must be in whole rupees.")
    .min(0, "Delivery charge can't be negative.")
    .max(MAX_RUPEES, "Delivery charge is too large."),
  showSampleRatings: z.boolean(),
});

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePermission("settings", "edit");

  const parsed = settingsSchema.safeParse({
    processingDays: formData.get("processingDays"),
    freeDeliveryThreshold: formData.get("freeDeliveryThreshold"),
    deliveryFee: formData.get("deliveryFee"),
    showSampleRatings: formData.get("showSampleRatings") === "on",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await prisma.storeSetting.upsert({
    where: { id: "store" },
    create: { id: "store", ...parsed.data },
    update: parsed.data,
  });

  // Every order page that falls back to the store value shows the new time,
  // and the cart, banner and policy pages show the new delivery charges.
  revalidateTag(STORE_SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { success: "Settings saved. New orders use these delivery charges; existing orders keep theirs." };
}
