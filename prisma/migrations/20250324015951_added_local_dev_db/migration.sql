-- CreateTable
CREATE TABLE "ScheduledTransition" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "fromRound" TEXT NOT NULL,
    "toRound" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledTransition_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScheduledTransition" ADD CONSTRAINT "ScheduledTransition_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
