-- DropForeignKey
ALTER TABLE "CinderellaPick" DROP CONSTRAINT "CinderellaPick_preTournamentPickId_fkey";

-- DropForeignKey
ALTER TABLE "CinderellaPick" DROP CONSTRAINT "CinderellaPick_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_team1Id_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_team2Id_fkey";

-- DropForeignKey
ALTER TABLE "GamePick" DROP CONSTRAINT "GamePick_gameId_fkey";

-- DropForeignKey
ALTER TABLE "GamePick" DROP CONSTRAINT "GamePick_participantId_fkey";

-- DropForeignKey
ALTER TABLE "GamePick" DROP CONSTRAINT "GamePick_teamId_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_team1Id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_team2Id_fkey";

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CinderellaPick" ADD CONSTRAINT "CinderellaPick_preTournamentPickId_fkey" FOREIGN KEY ("preTournamentPickId") REFERENCES "PreTournamentPick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CinderellaPick" ADD CONSTRAINT "CinderellaPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePick" ADD CONSTRAINT "GamePick_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePick" ADD CONSTRAINT "GamePick_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePick" ADD CONSTRAINT "GamePick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
