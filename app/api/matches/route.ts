// app/api/matches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get round from query params
    const { searchParams } = new URL(request.url);
    const roundParam = searchParams.get('round');
    
    // Convert round name to round number if provided
    const roundMap: { [key: string]: number } = {
      'Round of 64': 1,
      'Round of 32': 2,
      'Sweet 16': 3,
      'Elite 8': 4,
      'Final Four': 5,
      'Championship': 6
    };
    
    // Build where clause based on whether round is specified
    const where = roundParam ? { round: roundMap[roundParam] } : {};

    // Fetch matches
    const matches = await prisma.match.findMany({
      where,
      include: {
        team1: true,
        team2: true
      },
      orderBy: [
        { round: 'asc' },
        { region: 'asc' }
      ]
    });

    return NextResponse.json(matches);
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