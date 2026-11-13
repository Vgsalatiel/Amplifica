-- CreateEnum
CREATE TYPE "ShowStatus" AS ENUM ('CONFIRMED', 'SOLD_OUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "Show" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "slug" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "venue" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "ticketUrl" TEXT,
    "status" "ShowStatus" NOT NULL DEFAULT 'CONFIRMED',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowAct" (
    "id" UUID NOT NULL,
    "showId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "artistId" UUID,

    CONSTRAINT "ShowAct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowGenre" (
    "showId" UUID NOT NULL,
    "genreId" UUID NOT NULL,

    CONSTRAINT "ShowGenre_pkey" PRIMARY KEY ("showId","genreId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Show_slug_key" ON "Show"("slug");

-- CreateIndex
CREATE INDEX "Show_date_idx" ON "Show"("date");

-- CreateIndex
CREATE INDEX "Show_state_date_idx" ON "Show"("state", "date");

-- CreateIndex
CREATE INDEX "ShowAct_artistId_idx" ON "ShowAct"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowAct_showId_position_key" ON "ShowAct"("showId", "position");

-- CreateIndex
CREATE INDEX "ShowGenre_genreId_idx" ON "ShowGenre"("genreId");

-- AddForeignKey
ALTER TABLE "ShowAct" ADD CONSTRAINT "ShowAct_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowAct" ADD CONSTRAINT "ShowAct_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowGenre" ADD CONSTRAINT "ShowGenre_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowGenre" ADD CONSTRAINT "ShowGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Últimas barreiras no banco, caso algo grave por fora da API.
ALTER TABLE "Show" ADD CONSTRAINT "Show_state_format" CHECK ("state" ~ '^[A-Z]{2}$');
ALTER TABLE "Show" ADD CONSTRAINT "Show_startTime_format" CHECK ("startTime" IS NULL OR "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "ShowAct" ADD CONSTRAINT "ShowAct_position_positive" CHECK ("position" >= 0);
