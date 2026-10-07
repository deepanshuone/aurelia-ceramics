import type { Metadata } from "next";
import { requireAdmin } from "../../../lib/admin";
import { getStoreProcessingDays, readDeliveryRules } from "../../../lib/store-settings";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [processingDays, delivery] = await Promise.all([getStoreProcessingDays(), readDeliveryRules()]);

  return (
    <>
      <header className="admin-header">
        <h1>Settings</h1>
      </header>

      <section className="admin-panel">
        <SettingsForm processingDays={processingDays} delivery={delivery} />
      </section>
    </>
  );
}
