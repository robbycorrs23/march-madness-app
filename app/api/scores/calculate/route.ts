// app/api/scores/calculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';

// Points based on round (from the client-side getRoundPoints function)
const ROUND_POINTS = {
  'Round of 64': 1,
  'Round of 32': 2,
  'Sweet 16': 4,
  'Elite 8': 8,
  'Final Four': 15,
  'Championship': 25
};

export async function POST(req: NextRequest) {
  try {
    // Authenticate admin
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current tournament
    const tournament = await prisma.tournament.findFirst({
      where: { currentRound: { not: null } },
      select: { id: true, currentRound: true }
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'No active tournament found' },
        { status: 404 }
      );
    }

    // Get all completed games for the current round
    const completedGames = await prisma.game.findMany({
      where: {
        round: tournament.currentRound,
        completed: true
      },
      select: {
        id: true, 
        winnerId: true,
        gamePicks: {
          select: {
            id: true,
            participantId: true,
            teamId: true
          }
        }
      }
    });

    // Calculate points for each participant
    const participantScores: Record<number, { roundScore: number, preTournamentScore: number, cinderellaScore: number }> = {};

    // Process each game's picks
    for (const game of completedGames) {
      const roundPoints = ROUND_POINTS[tournament.currentRound as keyof typeof ROUND_POINTS] || 1;

      for (const pick of game.gamePicks) {
        // Initialize participant score tracking if not exists
        if (!participantScores[pick.participantId]) {
          const preTournamentPick = await prisma.preTournamentPick.findUnique({
            where: { participantId: pick.participantId },
            select: { score: true }
          });

          const cinderellaPicks = await prisma.cinderellaPick.findMany({
            where: { preTournamentPickId: preTournamentPick?.id },
            select: { teamId: true }
          });

          participantScores[pick.participantId] = {
            roundScore: 0,
            preTournamentScore: preTournamentPick?.score || 0,
            cinderellaScore: cinderellaPicks.length > 0 ? cinderellaPicks.length : 0
          };
        }

        // Check if pick matches game winner
        if (pick.teamId === game.winnerId) {
          // Add round points for correct pick
          participantScores[pick.participantId].roundScore += roundPoints;
        }
      }
    }

    // Update participant total scores
    const updatePromises = Object.entries(participantScores).map(([participantId, scores]) => {
      const totalScore = scores.preTournamentScore + 
                         scores.roundScore + 
                         scores.cinderellaScore;

      return prisma.participant.update({
        where: { id: parseInt(participantId) },
        data: { 
          totalScore 
        }
      });
    });

    // Execute all updates
    await Promise.all(updatePromises);

    return NextResponse.json({ 
      message: 'Scores calculated successfully',
      roundScores: participantScores 
    });

  } catch (error) {
    console.error('Error calculating scores:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate scores',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}