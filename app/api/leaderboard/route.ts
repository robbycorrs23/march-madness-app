import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

// Map numeric round values to points
const roundPointsMap = {
  1: 1,  // Round of 64
  2: 2,  // Round of 32
  3: 4,  // Sweet 16
  4: 8,  // Elite 8
  5: 15, // Final Four
  6: 25  // Championship
};

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
        preTournamentPick: {
          include: {
            finalFourPicks: {
              include: { team: true }
            },
            finalsPicks: {
              include: { team: true }
            },
            championPick: {
              include: { team: true }
            },
            cinderellaPicks: {
              include: { team: true }
            }
          }
        },
        gamePicks: {
          include: {
            game: true,
            team: true
          }
        },
        matchPicks: {
          include: {
            match: true,
            team: true
          }
        }
      },
      orderBy: {
        totalScore: 'desc',
      },
    });
    
    // Get all teams to check for Cinderella teams (seeds 11-16)
    const teams = await prisma.team.findMany({
      where: {
        tournamentId: tournament.id,
      }
    });
    
    // Transform the data for the leaderboard
    const leaderboardData = participants.map(participant => {
      // Get the stored pre-tournament score
      let preTournamentScore = participant.preTournamentPick?.score || 0;
      
      // Calculate Cinderella score
      let cinderellaScore = 0;
      
      // Calculate cinderella scores (this is for display only, already included in totalScore)
      if (tournament.currentRound !== 'Pre-Tournament' && participant.preTournamentPick) {
        const cinderellaPicks = participant.preTournamentPick.cinderellaPicks || [];
        
        cinderellaPicks.forEach(pick => {
          // Only count teams with seeds 11-16 as Cinderellas
          if (pick.team.seed >= 11 && pick.team.seed <= 16) {
            // Find matches where this team won
            const teamWins = participant.matchPicks.filter(
              matchPick => 
                matchPick.match.winnerId === pick.teamId && 
                matchPick.match.completed === true
            );
            
            teamWins.forEach(win => {
              const matchRound = win.match.round;
              const roundPoints = roundPointsMap[matchRound as keyof typeof roundPointsMap] || 0;
              cinderellaScore += roundPoints * 2; // Double points for Cinderella picks
            });
          }
        });
      }
      
      // Calculate round score (from matchPicks only)
      const matchScore = participant.matchPicks.reduce(
        (total, pick) => total + (pick.roundScore || 0), 
        0
      );
      
      // Return formatted data for the leaderboard, using the saved totalScore
      return {
        id: participant.id,
        name: participant.name,
        preTournamentScore,
        cinderellaScore,
        roundScore: matchScore,
        totalScore: participant.totalScore, // Use the stored total score
      };
    });
    
    // Sort by total score descending (should already be sorted from the query)
    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}