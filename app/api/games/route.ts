import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../lib/auth";
import { prisma } from '../../../lib/prisma';

// Define a type for the game input
type GameInput = {
  round: string;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId?: number | null;
  team1Score?: number | null;
  team2Score?: number | null;
  completed?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const data = await request.json();
    
    // Validate input
    if (!data.games || !Array.isArray(data.games) || !data.tournamentId) {
      return NextResponse.json(
        { error: 'Invalid game data or missing tournament ID' },
        { status: 400 }
      );
    }
    
    // Create games with tournamentId
    const createdGames = await prisma.game.createMany({
      data: data.games.map((game: GameInput) => ({
        round: game.round,
        region: game.region,
        team1Id: game.team1Id,
        team2Id: game.team2Id,
        winnerId: game.winnerId || null,
        team1Score: game.team1Score || null,
        team2Score: game.team2Score || null,
        completed: game.completed || false,
        tournamentId: data.tournamentId
      })),
    });
    
    return NextResponse.json(createdGames, { status: 201 });
  } catch (error) {
    console.error('Error creating games:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to create games', 
          details: error.message,
          stack: error.stack 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create games' },
      { status: 500 }
    );
  }
}

// Add this GET function to fetch games
export async function GET() {
  try {
    // Fetch the latest tournament first
    const tournament = await prisma.tournament.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!tournament) {
      return NextResponse.json([]);
    }

    // Fetch all games for this tournament
    const games = await prisma.game.findMany({
      where: {
        tournamentId: tournament.id,
      },
      orderBy: [
        { round: 'asc' },
        { region: 'asc' },
        { id: 'asc' }
      ]
    });
    
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

// Update game endpoint to update game results
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const data = await request.json();
    
    // Validate input
    if (!data.id || (!data.winnerId && data.winnerId !== null)) {
      return NextResponse.json(
        { error: 'Invalid game update data' },
        { status: 400 }
      );
    }
    
    // Update the game
    const updatedGame = await prisma.game.update({
      where: {
        id: data.id
      },
      data: {
        winnerId: data.winnerId,
        team1Score: data.team1Score || null,
        team2Score: data.team2Score || null,
        completed: data.completed || false
      }
    });
    
    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json(
      { error: 'Failed to update game' },
      { status: 500 }
    );
  }
}