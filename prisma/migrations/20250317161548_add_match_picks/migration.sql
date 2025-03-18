-- CreateTable
CREATE TABLE "MatchPick" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "correct" BOOLEAN,
    "roundScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MatchPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchPick_participantId_matchId_key" ON "MatchPick"("participantId", "matchId");

-- AddForeignKey
ALTER TABLE "MatchPick" ADD CONSTRAINT "MatchPick_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPick" ADD CONSTRAINT "MatchPick_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPick" ADD CONSTRAINT "MatchPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
