-- Links de grupos externos por show, com aprovação de moderador.
CREATE TYPE "GroupPlatform" AS ENUM ('WHATSAPP', 'TELEGRAM', 'DISCORD');
CREATE TYPE "GroupStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ShowGroup" (
    "id" UUID NOT NULL,
    "showId" UUID NOT NULL,
    "platform" "GroupPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ShowGroup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ShowGroup_url_https" CHECK ("url" ~ '^https://')
);

CREATE UNIQUE INDEX "ShowGroup_showId_url_key" ON "ShowGroup"("showId", "url");
CREATE INDEX "ShowGroup_showId_status_idx" ON "ShowGroup"("showId", "status");
CREATE INDEX "ShowGroup_status_createdAt_idx" ON "ShowGroup"("status", "createdAt");
CREATE INDEX "ShowGroup_submittedById_createdAt_idx" ON "ShowGroup"("submittedById", "createdAt");

ALTER TABLE "ShowGroup" ADD CONSTRAINT "ShowGroup_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowGroup" ADD CONSTRAINT "ShowGroup_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
