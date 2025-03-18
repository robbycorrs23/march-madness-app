// app/api/tournaments/[id]/teams/route.ts
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
    
    // Fetch teams for the tournament
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      orderBy: [
        { region: 'asc' },
        { seed: 'asc' },
      ],
    });
    
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching tournament teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament teams' },
      { status: 500 }
    );
  }
}