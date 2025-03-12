import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

// GET /api/leaderboard - Get leaderboard
export async function GET(req: NextRequest) {
  try {
    // Get the current tournament
    const tournament = await prisma.tournament.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    if (!tournament) {
      return NextResponse.json([]);
    }
    
    // Get participants with their scores
    const participants = await prisma.participant.findMany({
      where: {
        tournamentId: tournament.id,
      },
      include: {
        preTournamentPick: true,
        gamePicks: true,
      },
      orderBy: {
        totalScore: 'desc',
      },
    });
    
    // Transform the data for the leaderboard
    const leaderboardData = participants.map(participant => {
      // Calculate pre-tournament score
      const preTournamentScore = participant.preTournamentPick?.score || 0;
      
      // Calculate Cinderella score (we would need to implement this separately)
      // For now, we'll return a placeholder
      const cinderellaScore = 0;
      
      // Calculate round score
      const roundScore = participant.gamePicks.reduce(
        (total, pick) => total + (pick.roundScore || 0),
        0
      );
      
      return {
        id: participant.id,
        name: participant.name,
        preTournamentScore,
        cinderellaScore,
        roundScore,
        totalScore: participant.totalScore,
      };
    });
    
    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
