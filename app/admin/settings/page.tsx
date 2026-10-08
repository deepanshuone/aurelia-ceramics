import type { Metadata } from "next";
import { requirePermission } from "../../../lib/admin";
import { getStoreProcessingDays, readDeliveryRules, readShowSampleRatings } from "../../../lib/store-settings";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requirePermission("settings", "view");
  const [processingDays, delivery, showSampleRatings] = await Promise.all([
    getStoreProcessingDays(),
    readDeliveryRules(),
    readShowSampleRatings(),
  ]);

  return (
    <>
      <header className="admin-header">
        <h1>Settings</h1>
      </header>

      <section className="admin-panel">
        <SettingsForm processingDays={processingDays} delivery={delivery} showSampleRatings={showSampleRatings} />
      </section>
    </>
  );
}
