import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';

// POST /api/tournament/advance-round - Advance to next round (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const data = await req.json();
    const { tournamentId, nextRound } = data;
    
    // Update tournament current round
    const tournament = await prisma.tournament.update({
      where: { id: parseInt(tournamentId) },
      data: { currentRound: nextRound },
    });
    
    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Error advancing round:', error);
    return NextResponse.json(
      { error: 'Failed to advance round' },
      { status: 500 }
    );
  }
}
