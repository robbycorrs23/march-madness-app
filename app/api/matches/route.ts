// app/api/matches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get round from query params
    const { searchParams } = new URL(request.url);
    const roundParam = searchParams.get('round');
    
    // Convert round name to round number
    const roundMap: { [key: string]: number } = {
      'Round of 64': 1,
      'Round of 32': 2,
      'Sweet 16': 3,
      'Elite 8': 4,
      'Final Four': 5,
      'Championship': 6
    };
    
    const round = roundMap[roundParam || 'Round of 64'];

    // Fetch matches for the current round
    const matches = await prisma.match.findMany({
      where: { round },
      include: {
        team1: true,
        team2: true
      }
    });

    // Transform matches to match the existing Game interface in the frontend
    const transformedMatches = matches.map(match => ({
      id: match.id,
      round: roundParam || 'Round of 64',
      region: match.region,
      team1Id: match.team1Id,
      team2Id: match.team2Id,
      winnerId: match.winnerId,
      team1Score: null, // Matches don't have scores in this schema
      team2Score: null,
      completed: match.winnerId !== null
    }));

    return NextResponse.json(transformedMatches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch matches',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}