import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Admin pages need a signed-in user here; the admin layout then checks the
  // role against the database (lib/admin.ts). The role inside the login token
  // can be up to a minute old, so checking it here would bounce someone who
  // was just given access to the login page.
  const needsLogin = ["/account", "/admin", "/checkout", "/order-success"].some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (needsLogin && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/checkout", "/order-success"],
};
