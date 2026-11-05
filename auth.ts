import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import type { JWT } from "next-auth/jwt";
import { prisma } from "./lib/prisma";
import { authConfig } from "./auth.config";
import { clientIp, rateLimit } from "./lib/rate-limit";
import { isOwnerEmail } from "./lib/owner";
import { isValidSignupTicket, verifyCaptcha } from "./lib/captcha";

class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

class CaptchaFailed extends CredentialsSignin {
  code = "captcha";
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// How often a signed-in session is re-checked against the database. Blocking
// an account, changing its role or changing its password takes effect within
// this window instead of lasting until the login token expires (30 days).
const SESSION_RECHECK_MS = 60 * 1000;

// Customers stay signed in for 30 days (the cookie's lifetime). Staff logins
// open the admin panel, so they end after 12 hours and need a fresh sign-in.
const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;
const STAFF_SESSION_MAX_MS = 12 * 60 * 60 * 1000;

// Compared against when an email has no account, so a failed login takes the
// same time whether or not the email is registered.
const DUMMY_HASH = bcrypt.hashSync("aurelia-timing-equaliser", 12);

type SessionToken = JWT & {
  id?: string;
  role?: string;
  /** See passwordFingerprint(). */
  passwordFingerprint?: string;
  /** When the account was last re-checked against the database (ms). */
  checkedAt?: number;
  /** Random id of this login, so signing out can revoke just this one. */
  sid?: string;
  /** When this login happened (ms). */
  loginAt?: number;
};

/** Short fingerprint of the password hash: changes whenever the password does. */
function passwordFingerprint(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  session: { ...authConfig.session, maxAge: SESSION_MAX_AGE_S },
  events: {
    // A JWT login cookie normally keeps working until it expires, even after
    // "Sign Out" deletes it from this browser. Record the session id so a copy
    // of the cookie stops working too (checked in the jwt callback below).
    async signOut(message) {
      const token = ("token" in message ? message.token : null) as SessionToken | null;
      if (!token?.sid) return;
      const expiresAt = new Date(
        typeof token.exp === "number" ? token.exp * 1000 : Date.now() + SESSION_MAX_AGE_S * 1000
      );
      await prisma.revokedSession.upsert({
        where: { id: token.sid },
        create: { id: token.sid, expiresAt },
        update: {},
      });
      await prisma.revokedSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    // Node-only addition to the edge-safe jwt callback: periodically confirm
    // the account is still active, with the same role and password.
    async jwt(params) {
      const token = (await authConfig.callbacks!.jwt!(params)) as SessionToken | null;
      if (!token) return null;

      if (params.user) {
        token.passwordFingerprint = (params.user as { passwordFingerprint?: string }).passwordFingerprint;
        token.checkedAt = Date.now();
        token.sid = randomUUID();
        token.loginAt = Date.now();
        return token;
      }

      // Staff logins expire after 12 hours, checked on every request.
      if (token.role !== "CUSTOMER" && token.loginAt && Date.now() - token.loginAt > STAFF_SESSION_MAX_MS) {
        return null;
      }

      if (!token.id || (token.checkedAt && Date.now() - token.checkedAt < SESSION_RECHECK_MS)) return token;

      // Sessions issued before these checks existed carry no id or login
      // time; give them one rather than signing everyone out.
      token.sid ??= randomUUID();
      token.loginAt ??= Date.now();

      const [customer, revoked] = await Promise.all([
        prisma.customer.findUnique({
          where: { id: token.id },
          select: { email: true, role: true, isActive: true, passwordHash: true, sessionsRevokedAt: true },
        }),
        prisma.revokedSession.findUnique({ where: { id: token.sid }, select: { id: true } }),
      ]);
      if (revoked || !customer?.isActive || !customer.passwordHash) return null;
      // "Sign out of all devices" ends every login from before it was pressed.
      if (customer.sessionsRevokedAt && token.loginAt < customer.sessionsRevokedAt.getTime()) return null;

      const fingerprint = passwordFingerprint(customer.passwordHash);
      // Sessions issued before this check existed carry no fingerprint; adopt
      // the current one rather than signing everyone out.
      if (token.passwordFingerprint && token.passwordFingerprint !== fingerprint) return null;

      token.passwordFingerprint = fingerprint;
      token.role = isOwnerEmail(customer.email) ? "ADMIN" : customer.role;
      token.checkedAt = Date.now();
      if (token.role !== "CUSTOMER" && Date.now() - token.loginAt > STAFF_SESSION_MAX_MS) return null;
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captchaToken: {},
        signupTicket: {},
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

        // Bot check, skipped for the automatic sign-in right after sign-up
        // (which already passed one; see lib/captcha.ts).
        const ip = clientIp(request.headers);
        if (
          !isValidSignupTicket(credentials?.signupTicket, email) &&
          !(await verifyCaptcha(credentials?.captchaToken, ip))
        ) {
          throw new CaptchaFailed();
        }

        const customer = await prisma.customer.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!customer || !customer.passwordHash || !customer.isActive) {
          await bcrypt.compare(password, DUMMY_HASH);
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
          passwordFingerprint: passwordFingerprint(customer.passwordHash),
        };
      },
    }),
  ],
});
