-- "Eu vou": presença de uma pessoa num show. O nome só aparece na lista se ela marcar "showName".
CREATE TABLE "ShowAttendance" (
    "userId" UUID NOT NULL,
    "showId" UUID NOT NULL,
    "showName" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowAttendance_pkey" PRIMARY KEY ("userId","showId")
);

CREATE INDEX "ShowAttendance_showId_createdAt_idx" ON "ShowAttendance"("showId", "createdAt");

ALTER TABLE "ShowAttendance" ADD CONSTRAINT "ShowAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowAttendance" ADD CONSTRAINT "ShowAttendance_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
