"use client";

import { useEffect } from "react";
import { trackPurchase, type TrackedItem } from "../lib/analytics";

/** Reports a confirmed order to the ad platforms (once per browser). */
export default function TrackPurchase({ orderId, total, items }: { orderId: string; total: number; items: TrackedItem[] }) {
  useEffect(() => {
    trackPurchase(orderId, total, items);
    // Only the order matters; the rest is fixed for a given order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);
  return null;
}
