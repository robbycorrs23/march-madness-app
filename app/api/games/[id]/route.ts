// app/api/games/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../../lib/auth";
import { prisma } from '../../../../../lib/prisma';

// PATCH: Update game result
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

    // Parse game ID from params
    const gameId = parseInt(params.id);
    
    // Parse request body
    const data = await request.json();
    const { winnerId, team1Score, team2Score } = data;

    // Validate input
    if (!winnerId || team1Score === undefined || team2Score === undefined) {
      return NextResponse.json(
        { error: 'Invalid game data' },
        { status: 400 }
      );
    }

    // Update game in the database
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        winnerId: winnerId,
        team1Score: team1Score,
        team2Score: team2Score,
        completed: true
      },
      include: {
        team1: true,
        team2: true
      }
    });

    // Mark losing team as eliminated if it's the final round
    if (updatedGame.round === 'Championship') {
      const losingTeamId = updatedGame.team1.id === winnerId 
        ? updatedGame.team2.id 
        : updatedGame.team1.id;

      await prisma.team.update({
        where: { id: losingTeamId },
        data: { eliminated: true }
      });
    }

    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update game',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}