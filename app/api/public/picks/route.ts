// app/api/public/picks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// Map round names to numeric values
const roundMap = {
  'Round of 64': 1,
  'Round of 32': 2,
  'Sweet 16': 3,
  'Elite 8': 4,
  'Final Four': 5,
  'Championship': 6
};

/**
 * GET /api/public/picks
 * 
 * Public endpoint to retrieve participant picks for a specific round
 * Does not require authentication since this is intended for the public-facing leaderboard
 */
export async function GET(request: NextRequest) {
  try {
    // Get round from query params
    const searchParams = request.nextUrl.searchParams;
    const roundName = searchParams.get('round');
    
    if (!roundName || !roundMap[roundName as keyof typeof roundMap]) {
      return NextResponse.json(
        { error: 'Valid round parameter is required' },
        { status: 400 }
      );
    }
    
    // Convert round name to numeric value for the database query
    const roundNumber = roundMap[roundName as keyof typeof roundMap];
    
    // Get current tournament to check if it's in progress
    const tournament = await prisma.tournament.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    
    if (!tournament) {
      return NextResponse.json(
        { error: 'No active tournament found' },
        { status: 404 }
      );
    }
    
    // If tournament is in pre-tournament stage, don't show picks
    if (tournament.currentRound === 'Pre-Tournament') {
      return NextResponse.json(
        { 
          message: 'Tournament has not started yet', 
          showPicks: false,
          tournament: {
            id: tournament.id,
            currentRound: tournament.currentRound
          }
        },
        { status: 200 }
      );
    }
    
    // For non-Pre-Tournament rounds, once the tournament has started, we show the picks
    // The showPicks flag is now determined by whether the tournament has started, not by completed matches
    const showPicks = tournament.currentRound !== 'Pre-Tournament';
    
    // Get all matches for the requested round, using the numeric round value
    const matches = await prisma.match.findMany({
      where: { round: roundNumber },
      include: {
        team1: true,
        team2: true
      }
    });
    
    // Get all participants (public info only)
    const participants = await prisma.participant.findMany({
      select: {
        id: true,
        name: true,
        totalScore: true
      }
    });
    
    // If the tournament hasn't started yet, only return basic data
    if (!showPicks) {
      return NextResponse.json({
        message: 'Tournament has not started yet',
        showPicks: false,
        tournament: {
          id: tournament.id,
          currentRound: tournament.currentRound
        },
        participants,
        matches: matches.map(match => ({
          id: match.id,
          team1: {
            id: match.team1.id,
            name: match.team1.name,
            seed: match.team1.seed
          },
          team2: {
            id: match.team2.id,
            name: match.team2.name,
            seed: match.team2.seed
          },
          completed: match.completed
        }))
      });
    }
    
    // Get all match picks for this round
    const allMatchPicks = await prisma.matchPick.findMany({
      where: {
        match: {
          round: roundNumber
        }
      },
      include: {
        match: true,
        team: true,
        participant: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Format picks by participant for easier consumption
    const picksByParticipant = participants.map(participant => {
      const participantPicks = allMatchPicks.filter(pick => 
        pick.participantId === participant.id
      );
      
      return {
        participantId: participant.id,
        participantName: participant.name,
        totalScore: participant.totalScore,
        picks: participantPicks.map(pick => ({
          matchId: pick.matchId,
          teamId: pick.teamId,
          teamName: pick.team.name,
          teamSeed: pick.team.seed,
          correct: pick.correct
        }))
      };
    });
    
    return NextResponse.json({
      showPicks: true,
      tournament: {
        id: tournament.id,
        currentRound: tournament.currentRound
      },
      matches: matches.map(match => ({
        id: match.id,
        team1: {
          id: match.team1.id,
          name: match.team1.name,
          seed: match.team1.seed
        },
        team2: {
          id: match.team2.id,
          name: match.team2.name,
          seed: match.team2.seed
        },
        winnerId: match.winnerId,
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        completed: match.completed
      })),
      participants: picksByParticipant
    });
  } catch (error) {
    console.error('Error fetching public picks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch picks', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}