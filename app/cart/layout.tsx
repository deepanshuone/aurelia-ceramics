import type { Metadata } from "next";

// Private, per-visitor pages: keep them out of search results.
export const metadata: Metadata = {
  title: "Your Cart",
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
