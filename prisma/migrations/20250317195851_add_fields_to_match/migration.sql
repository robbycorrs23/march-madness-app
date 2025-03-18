-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "team1Score" INTEGER,
ADD COLUMN     "team2Score" INTEGER;
