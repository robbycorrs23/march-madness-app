// app/api/debug/scores/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// Define TypeScript interfaces for debug info
interface Tournament {
  id: number;
  currentRound: string;
}

interface Participant {
  id: number;
  name: string;
  totalScore: number;
}

interface Match {
  id: number;
  round: number;
  winnerId: number;
  team1Id: number;
  team2Id: number;
}

interface MatchPick {
  id: number;
  participantId: number;
  matchId: number;
  teamId: number;
  correct: boolean | null;
  roundScore: number;
  match: {
    completed: boolean;
    winnerId: number | null;
  };
}

interface PreTournamentPick {
  id: number;
  participantId: number;
  score: number;
  // Add other properties as needed
  finalFourPicks: any[];
  finalsPicks: any[];
  championPick: any;
  cinderellaPicks: any[];
}

interface ScoreUpdate {
  participantId: number;
  participantName: string;
  currentScore: number;
  calculatedScore: number;
  breakdown: {
    matchPicksTotal: number;
    gamePicksTotal: number;
    preTournamentScore: number;
  };
}

interface DebugInfo {
  tournament: Tournament | null;
  participants: Participant[];
  completedMatches: Match[];
  matchPicks: MatchPick[];
  preTournamentPicks: PreTournamentPick[];
  sampleUpdates: ScoreUpdate[];
}

export async function GET(req: NextRequest) {
  // Initialize debug info with proper typing
  const debugInfo: DebugInfo = {
    tournament: null,
    participants: [],
    completedMatches: [],
    matchPicks: [],
    preTournamentPicks: [],
    sampleUpdates: []
  };

  try {
    // 1. Check tournament status
    const tournament = await prisma.tournament.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, currentRound: true }
    });
    
    debugInfo.tournament = tournament;
    
    if (!tournament) {
      return NextResponse.json({ error: 'No tournament found', debugInfo });
    }
    
    // 2. Check if participants exist
    const participants = await prisma.participant.findMany({
      where: { tournamentId: tournament.id },
      select: { id: true, name: true, totalScore: true }
    });
    
    debugInfo.participants = participants;
    
    if (participants.length === 0) {
      return NextResponse.json({ error: 'No participants found', debugInfo });
    }
    
    // 3. Check for completed matches
    const completedMatches = await prisma.match.findMany({
      where: { 
        completed: true,
        winnerId: { not: null }
      },
      select: {
        id: true,
        round: true,
        winnerId: true,
        team1Id: true,
        team2Id: true
      }
    });
    
    debugInfo.completedMatches = completedMatches as Match[];
    
    if (completedMatches.length === 0) {
      return NextResponse.json({ 
        error: 'No completed matches with winners found', 
        troubleshooting: 'Check if matches have been marked as completed and have winners assigned',
        debugInfo 
      });
    }
    
    // 4. Check for a sample participant's match picks
    const sampleParticipant = participants[0];
    const matchPicks = await prisma.matchPick.findMany({
      where: { participantId: sampleParticipant.id },
      include: { match: true }
    });
    
    debugInfo.matchPicks = matchPicks as MatchPick[];
    
    if (matchPicks.length === 0) {
      return NextResponse.json({ 
        error: 'No match picks found for sample participant', 
        troubleshooting: 'Check if participants have submitted picks for matches',
        debugInfo 
      });
    }
    
    // 5. Check pre-tournament picks
    const preTournamentPicks = await prisma.preTournamentPick.findMany({
      take: 3,
      include: {
        finalFourPicks: true,
        finalsPicks: true,
        championPick: true,
        cinderellaPicks: true
      }
    });
    
    debugInfo.preTournamentPicks = preTournamentPicks as PreTournamentPick[];
    
    // 6. Test updating a single participant score
    // This is a simulation - it won't actually update the database
    const testParticipant = participants[0];
    const matchPicksTotal = await prisma.matchPick.aggregate({
      where: { participantId: testParticipant.id },
      _sum: { roundScore: true }
    });
    
    const gamePicksTotal = await prisma.gamePick.aggregate({
      where: { participantId: testParticipant.id },
      _sum: { roundScore: true }
    });
    
    const preTournamentPick = await prisma.preTournamentPick.findUnique({
      where: { participantId: testParticipant.id },
      select: { score: true }
    });
    
    const simulatedTotalScore = 
      (matchPicksTotal._sum.roundScore || 0) + 
      (gamePicksTotal._sum.roundScore || 0) + 
      (preTournamentPick?.score || 0);
    
    debugInfo.sampleUpdates.push({
      participantId: testParticipant.id,
      participantName: testParticipant.name,
      currentScore: testParticipant.totalScore,
      calculatedScore: simulatedTotalScore,
      breakdown: {
        matchPicksTotal: matchPicksTotal._sum.roundScore || 0,
        gamePicksTotal: gamePicksTotal._sum.roundScore || 0,
        preTournamentScore: preTournamentPick?.score || 0
      }
    });
    
    return NextResponse.json({ 
      message: 'Score calculation debug information',
      debugInfo,
      recommendations: [
        'Check if matches are marked as completed and have winners assigned',
        'Verify participants have submitted picks for matches',
        'Look at the sample update calculation to see if scores would change',
        'If calculated score differs from current score, there may be an issue with the update process'
      ]
    });
  } catch (error) {
    console.error('Error in score debugging:', error);
    return NextResponse.json(
      { 
        error: 'Error while debugging scores',
        details: error instanceof Error ? error.message : String(error),
        debugInfo
      },
      { status: 500 }
    );
  }
}