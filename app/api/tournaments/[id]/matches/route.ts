// app/api/tournaments/[id]/matches/route.ts
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
    
    // First get all teams for this tournament
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      select: { id: true }
    });
    
    // Get team IDs for this tournament
    const teamIds = teams.map(team => team.id);
    
    // Fetch matches involving teams from this tournament
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { team1Id: { in: teamIds } },
          { team2Id: { in: teamIds } }
        ]
      },
      orderBy: [
        { round: 'asc' },
        { region: 'asc' },
      ],
    });
    
    return NextResponse.json(matches);
  } catch (error) {
    console.error('Error fetching tournament matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament matches' },
      { status: 500 }
    );
  }
}