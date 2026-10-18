ALTER TABLE "OAuthAccount" ADD COLUMN "email" TEXT;

CREATE TABLE "GoogleOAuthState" (
    "stateHash" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleOAuthState_pkey" PRIMARY KEY ("stateHash"),
    CONSTRAINT "GoogleOAuthState_intent_check" CHECK (
        ("intent" = 'login' AND "userId" IS NULL) OR
        ("intent" = 'link' AND "userId" IS NOT NULL)
    )
);

CREATE TABLE "GoogleOAuthExchange" (
    "codeHash" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oauthAccountId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleOAuthExchange_pkey" PRIMARY KEY ("codeHash")
);

CREATE INDEX "GoogleOAuthState_expiresAt_idx" ON "GoogleOAuthState"("expiresAt");
CREATE INDEX "GoogleOAuthExchange_expiresAt_idx" ON "GoogleOAuthExchange"("expiresAt");
CREATE INDEX "GoogleOAuthExchange_oauthAccountId_idx" ON "GoogleOAuthExchange"("oauthAccountId");
ALTER TABLE "GoogleOAuthState" ADD CONSTRAINT "GoogleOAuthState_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleOAuthExchange" ADD CONSTRAINT "GoogleOAuthExchange_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleOAuthExchange" ADD CONSTRAINT "GoogleOAuthExchange_oauthAccountId_fkey"
    FOREIGN KEY ("oauthAccountId") REFERENCES "OAuthAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
