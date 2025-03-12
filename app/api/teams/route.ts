import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../lib/prisma';

// Define a type for the team input
type TeamInput = {
  name: string;
  seed: number;
  region: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const data = await request.json();

    // Validate input
    if (!data.teams || !Array.isArray(data.teams)) {
      return NextResponse.json(
        { error: 'Invalid team data' },
        { status: 400 }
      );
    }

    // Create teams with explicit type annotation
    const createdTeams = await prisma.team.createMany({
      data: data.teams.map((team: TeamInput) => ({
        name: team.name,
        seed: team.seed,
        region: team.region,
      })),
    });

    return NextResponse.json(createdTeams, { status: 201 });
  } catch (error) {
    console.error('Error creating teams:', error);
    return NextResponse.json(
      { error: 'Failed to create teams' },
      { status: 500 }
    );
  }
}
