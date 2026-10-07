import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";
import { authConfig } from "./auth.config";
import { clientIp, rateLimit } from "./lib/rate-limit";
import { isOwnerEmail } from "./lib/owner";

class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        // Slow down password guessing: per account and per IP address.
        const byEmail = rateLimit(`login:email:${email.toLowerCase()}`, 10, FIFTEEN_MINUTES);
        const byIp = rateLimit(`login:ip:${clientIp(request.headers)}`, 30, FIFTEEN_MINUTES);
        if (!byEmail.allowed || !byIp.allowed) throw new TooManyAttempts();

        const customer = await prisma.customer.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!customer || !customer.passwordHash || !customer.isActive) {
          return null;
        }

        const valid = await bcrypt.compare(password, customer.passwordHash);
        if (!valid) return null;

        await prisma.customer.update({
          where: { id: customer.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          // The owner (OWNER_EMAIL) is always a full admin.
          role: isOwnerEmail(customer.email) ? "ADMIN" : customer.role,
        };
      },
    }),
  ],
});
