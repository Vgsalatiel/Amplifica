-- Seguir pessoas: base do feed de atividade.
CREATE TABLE "Follow" (
    "followerId" UUID NOT NULL,
    "followedId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followedId"),
    -- Ninguém segue a si mesmo.
    CONSTRAINT "Follow_not_self" CHECK ("followerId" <> "followedId")
);

CREATE INDEX "Follow_followedId_createdAt_idx" ON "Follow"("followedId", "createdAt");

CREATE INDEX "Follow_followerId_createdAt_idx" ON "Follow"("followerId", "createdAt");

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followedId_fkey" FOREIGN KEY ("followedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
