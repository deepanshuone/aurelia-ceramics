-- Server-side sign-out: revoked login sessions, and "sign out of all devices".
ALTER TABLE "Customer" ADD COLUMN "sessionsRevokedAt" TIMESTAMP(3);

CREATE TABLE "RevokedSession" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevokedSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RevokedSession_expiresAt_idx" ON "RevokedSession"("expiresAt");
