// app/api/matches/[id]/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../../lib/auth";
import { prisma } from '../../../../../lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const matchId = parseInt(params.id);
    const { completed } = await request.json();
    
    // Update the match to mark as completed
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: { completed },
      include: {
        team1: true,
        team2: true
      }
    });
    
    return NextResponse.json(updatedMatch);
  } catch (error) {
    console.error('Error completing match:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update match status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}