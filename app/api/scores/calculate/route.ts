// app/api/scores/calculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';
import { calculateScores } from '../../../../lib/calculateScores';

// POST /api/scores/calculate - Calculate scores for all participants
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const tournamentId = body.tournamentId;
    
    if (!tournamentId) {
      // Get current tournament if not specified
      const tournament = await prisma.tournament.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      });
      
      if (!tournament) {
        return NextResponse.json(
          { error: 'No tournament found' },
          { status: 404 }
        );
      }
      
      await calculateScores(tournament.id);
    } else {
      await calculateScores(tournamentId);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Scores calculated successfully` 
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