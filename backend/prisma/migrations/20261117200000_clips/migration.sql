-- Playlist colaborativa "Agora na tela": clipes fixos e sugestões de quem tem conta.
CREATE TYPE "ClipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Clip" (
    "id" UUID NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "artistId" UUID,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "ClipStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id"),
    -- Código de vídeo do YouTube: 11 caracteres de letras, números, "-" e "_".
    CONSTRAINT "Clip_youtubeId_format" CHECK ("youtubeId" ~ '^[A-Za-z0-9_-]{11}$')
);

CREATE UNIQUE INDEX "Clip_youtubeId_key" ON "Clip"("youtubeId");
CREATE INDEX "Clip_status_pinned_createdAt_idx" ON "Clip"("status", "pinned", "createdAt");
CREATE INDEX "Clip_submittedById_createdAt_idx" ON "Clip"("submittedById", "createdAt");

ALTER TABLE "Clip" ADD CONSTRAINT "Clip_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
