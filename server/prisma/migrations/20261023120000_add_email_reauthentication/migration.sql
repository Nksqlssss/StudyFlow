CREATE TYPE "ReauthPurpose" AS ENUM ('set_password', 'change_email');

CREATE TABLE "ReauthChallenge" (
    "userId" TEXT NOT NULL,
    "purpose" "ReauthPurpose" NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "codeHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "sendWindowStartedAt" TIMESTAMP(3) NOT NULL,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "attemptWindowStartedAt" TIMESTAMP(3) NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ReauthChallenge_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "ReauthToken" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "ReauthPurpose" NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReauthToken_pkey" PRIMARY KEY ("tokenHash")
);

CREATE TABLE "SessionRevocation" (
    "sessionHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SessionRevocation_pkey" PRIMARY KEY ("sessionHash")
);

CREATE INDEX "ReauthToken_userId_idx" ON "ReauthToken"("userId");
CREATE INDEX "ReauthToken_expiresAt_idx" ON "ReauthToken"("expiresAt");
CREATE INDEX "SessionRevocation_userId_idx" ON "SessionRevocation"("userId");
CREATE INDEX "SessionRevocation_expiresAt_idx" ON "SessionRevocation"("expiresAt");

ALTER TABLE "ReauthChallenge" ADD CONSTRAINT "ReauthChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReauthToken" ADD CONSTRAINT "ReauthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionRevocation" ADD CONSTRAINT "SessionRevocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
