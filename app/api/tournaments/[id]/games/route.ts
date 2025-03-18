// app/api/tournaments/[id]/games/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../../lib/auth";
import { prisma } from '../../../../../lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Correctly await the params
    const { id } = await params;
    const tournamentId = parseInt(id);
    
    // Fetch games for the tournament
    const games = await prisma.game.findMany({
      where: { tournamentId },
      orderBy: [
        { round: 'asc' },
        { region: 'asc' },
        { id: 'asc' },
      ],
    });
    
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error fetching tournament games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament games' },
      { status: 500 }
    );
  }
}