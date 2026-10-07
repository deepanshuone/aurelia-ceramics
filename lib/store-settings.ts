import { prisma } from "./prisma";
import { DEFAULT_PROCESSING_DAYS } from "./processing";

/** The store-wide processing time; the default until an admin saves one. */
export async function getStoreProcessingDays() {
  const setting = await prisma.storeSetting.findUnique({
    where: { id: "store" },
    select: { processingDays: true },
  });
  return setting?.processingDays ?? DEFAULT_PROCESSING_DAYS;
}
