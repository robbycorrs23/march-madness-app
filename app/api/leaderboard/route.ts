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
      // Calculate pre-tournament score
      let preTournamentScore = participant.preTournamentPick?.score || 0;
      
      // Calculate Cinderella score
      let cinderellaScore = 0;
      
      // If the tournament has started, calculate Cinderella scores
      if (tournament.currentRound !== 'Pre-Tournament' && participant.preTournamentPick) {
        // Get Cinderella picks (teams with seeds 11-16)
        const cinderellaPicks = participant.preTournamentPick.cinderellaPicks || [];
        
        // For each Cinderella pick, calculate double points for each win
        cinderellaPicks.forEach(pick => {
          // Find matches where this team won
          const teamWins = participant.matchPicks.filter(
            matchPick => matchPick.teamId === pick.teamId && matchPick.correct === true
          );
          
          // Calculate points based on the round
          let cinderellaPoints = 0;
          teamWins.forEach(win => {
            const matchRound = win.match.round;
            // Apply the standard round points
            switch(matchRound) {
              case 'Round of 64': cinderellaPoints += 2; break; // 1 * 2 (double)
              case 'Round of 32': cinderellaPoints += 4; break; // 2 * 2 (double)
              case 'Sweet 16': cinderellaPoints += 8; break; // 4 * 2 (double)
              case 'Elite 8': cinderellaPoints += 16; break; // 8 * 2 (double)
              case 'Final Four': cinderellaPoints += 30; break; // 15 * 2 (double)
              case 'Championship': cinderellaPoints += 50; break; // 25 * 2 (double)
            }
          });
          
          cinderellaScore += cinderellaPoints;
        });
      }
      
      // Calculate round score (from both gamePicks and matchPicks)
      const gamePicks = participant.gamePicks || [];
      const matchPicks = participant.matchPicks || [];
      
      // Sum up round scores from all picks
      const roundScore = 
        gamePicks.reduce((total, pick) => total + (pick.roundScore || 0), 0) +
        matchPicks.reduce((total, pick) => total + (pick.roundScore || 0), 0);
      
      // Return formatted data for the leaderboard
      return {
        id: participant.id,
        name: participant.name,
        preTournamentScore,
        cinderellaScore,
        roundScore,
        totalScore: preTournamentScore + cinderellaScore + roundScore,
      };
    });
    
    // Sort by total score descending
    leaderboardData.sort((a, b) => b.totalScore - a.totalScore);
    
    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}