import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../lib/auth";
import { prisma } from '../../../lib/prisma';

// Define a type for the team input
type TeamInput = {
  name: string;
  seed: number;
  region: string;
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

// Add this GET function to your existing file
export async function GET() {
  try {
    // Fetch all teams from the database
    const teams = await prisma.team.findMany({
      orderBy: [
        { region: 'asc' },
        { seed: 'asc' }
      ]
    });
    
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}
