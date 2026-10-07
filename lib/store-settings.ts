import { unstable_cache } from "next/cache";
import { DEFAULT_DELIVERY_RULES, type DeliveryRules } from "./cart";
import { prisma } from "./prisma";
import { DEFAULT_PROCESSING_DAYS } from "./processing";

/** Cache tag for store settings shown on public pages; saving settings revalidates it. */
export const STORE_SETTINGS_TAG = "store-settings";

/** The store-wide processing time; the default until an admin saves one. */
export async function getStoreProcessingDays() {
  const setting = await prisma.storeSetting.findUnique({
    where: { id: "store" },
    select: { processingDays: true },
  });
  return setting?.processingDays ?? DEFAULT_PROCESSING_DAYS;
}

/** Current delivery pricing, read straight from the database. Checkout uses this. */
export async function readDeliveryRules(): Promise<DeliveryRules> {
  const setting = await prisma.storeSetting.findUnique({
    where: { id: "store" },
    select: { freeDeliveryThreshold: true, deliveryFee: true },
  });
  return setting ?? DEFAULT_DELIVERY_RULES;
}

/**
 * Delivery pricing for display (cart, banners, policy pages). Cached; saving
 * Admin → Settings refreshes it immediately via revalidateTag.
 */
export const getDeliveryRules = unstable_cache(readDeliveryRules, ["delivery-rules"], {
  revalidate: 600,
  tags: [STORE_SETTINGS_TAG],
});
