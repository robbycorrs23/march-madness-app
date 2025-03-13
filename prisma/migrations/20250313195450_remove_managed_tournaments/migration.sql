-- CreateTable
CREATE TABLE "Tournament" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "entryFee" DOUBLE PRECISION NOT NULL,
    "currentRound" TEXT NOT NULL,
    "regions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "tournamentId" INTEGER NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "round" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "team1Id" INTEGER NOT NULL,
    "team2Id" INTEGER NOT NULL,
    "winnerId" INTEGER,
    "team1Score" INTEGER,
    "team2Score" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "tournamentId" INTEGER NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "tournamentId" INTEGER NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreTournamentPick" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PreTournamentPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalFourPick" (
    "id" SERIAL NOT NULL,
    "preTournamentPickId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "FinalFourPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalsPick" (
    "id" SERIAL NOT NULL,
    "preTournamentPickId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "FinalsPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionPick" (
    "id" SERIAL NOT NULL,
    "preTournamentPickId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "ChampionPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CinderellaPick" (
    "id" SERIAL NOT NULL,
    "preTournamentPickId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "CinderellaPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePick" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "correct" BOOLEAN,
    "roundScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GamePick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "round" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "team1Id" INTEGER NOT NULL,
    "team2Id" INTEGER NOT NULL,
    "winnerId" INTEGER,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreTournamentPick_participantId_key" ON "PreTournamentPick"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalFourPick_preTournamentPickId_teamId_key" ON "FinalFourPick"("preTournamentPickId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalsPick_preTournamentPickId_teamId_key" ON "FinalsPick"("preTournamentPickId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionPick_preTournamentPickId_key" ON "ChampionPick"("preTournamentPickId");

-- CreateIndex
CREATE UNIQUE INDEX "CinderellaPick_preTournamentPickId_teamId_key" ON "CinderellaPick"("preTournamentPickId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePick_participantId_gameId_key" ON "GamePick"("participantId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreTournamentPick" ADD CONSTRAINT "PreTournamentPick_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalFourPick" ADD CONSTRAINT "FinalFourPick_preTournamentPickId_fkey" FOREIGN KEY ("preTournamentPickId") REFERENCES "PreTournamentPick"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalFourPick" ADD CONSTRAINT "FinalFourPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalsPick" ADD CONSTRAINT "FinalsPick_preTournamentPickId_fkey" FOREIGN KEY ("preTournamentPickId") REFERENCES "PreTournamentPick"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalsPick" ADD CONSTRAINT "FinalsPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionPick" ADD CONSTRAINT "ChampionPick_preTournamentPickId_fkey" FOREIGN KEY ("preTournamentPickId") REFERENCES "PreTournamentPick"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionPick" ADD CONSTRAINT "ChampionPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CinderellaPick" ADD CONSTRAINT "CinderellaPick_preTournamentPickId_fkey" FOREIGN KEY ("preTournamentPickId") REFERENCES "PreTournamentPick"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CinderellaPick" ADD CONSTRAINT "CinderellaPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePick" ADD CONSTRAINT "GamePick_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePick" ADD CONSTRAINT "GamePick_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePick" ADD CONSTRAINT "GamePick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
