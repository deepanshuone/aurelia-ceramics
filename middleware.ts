import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isAdminRoute = pathname.startsWith("/admin");
  const needsLogin = ["/account", "/checkout", "/order-success"].some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Pages re-check the exact role against the database (lib/admin.ts); this
  // only keeps customers out. Kept inline: lib/admin.ts can't run on the edge.
  const isStaff = role === "ADMIN" || role === "EDITOR" || role === "VIEWER";

  if ((isAdminRoute && (!isLoggedIn || !isStaff)) || (needsLogin && !isLoggedIn)) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/checkout", "/order-success"],
};
