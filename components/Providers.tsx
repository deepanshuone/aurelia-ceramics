"use client";

import { SessionProvider } from "next-auth/react";
import CartProvider from "./CartProvider";
import type { DeliveryRules } from "../lib/cart";

export default function Providers({
  children,
  delivery,
}: {
  children: React.ReactNode;
  delivery: DeliveryRules;
}) {
  return (
    <SessionProvider>
      <CartProvider delivery={delivery}>{children}</CartProvider>
    </SessionProvider>
  );
}
