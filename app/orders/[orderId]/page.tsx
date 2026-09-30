import { permanentRedirect } from "next/navigation";

export default async function LegacyOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  permanentRedirect(`/account/orders/${encodeURIComponent(orderId)}`);
}
