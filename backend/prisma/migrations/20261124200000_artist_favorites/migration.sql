-- Bandas favoritas de cada pessoa (a estrela na página da banda).
CREATE TABLE "ArtistFavorite" (
    "userId" UUID NOT NULL,
    "artistId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistFavorite_pkey" PRIMARY KEY ("userId","artistId")
);

CREATE INDEX "ArtistFavorite_artistId_idx" ON "ArtistFavorite"("artistId");

CREATE INDEX "ArtistFavorite_userId_createdAt_idx" ON "ArtistFavorite"("userId", "createdAt");

ALTER TABLE "ArtistFavorite" ADD CONSTRAINT "ArtistFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtistFavorite" ADD CONSTRAINT "ArtistFavorite_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
