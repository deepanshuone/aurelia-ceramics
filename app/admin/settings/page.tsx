import type { Metadata } from "next";
import { requireAdmin } from "../../../lib/admin";
import { getStoreProcessingDays } from "../../../lib/store-settings";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const processingDays = await getStoreProcessingDays();

  return (
    <>
      <header className="admin-header">
        <h1>Settings</h1>
      </header>

      <section className="admin-panel">
        <h2>Order processing</h2>
        <SettingsForm processingDays={processingDays} />
      </section>
    </>
  );
}
