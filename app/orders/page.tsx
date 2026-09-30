import { permanentRedirect } from "next/navigation";

// Orders used to live in localStorage at /orders; they're now account-backed.
export default function LegacyOrdersPage() {
  permanentRedirect("/account/orders");
}
