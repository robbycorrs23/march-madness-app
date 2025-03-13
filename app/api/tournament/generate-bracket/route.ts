import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';

// Define types for better type safety
type Team = {
  id: number;
  name: string;
  seed: number;
  region: string;
};

type TeamsByRegion = {
  [key: string]: Team[];
};

type BracketEntry = {
  round: number;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
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

    // Fetch all teams
    const teams: Team[] = await prisma.team.findMany({
      orderBy: [
        { region: 'asc' },
        { seed: 'asc' }
      ]
    });

    // Organize teams by region
    const teamsByRegion: TeamsByRegion = {};

    teams.forEach(team => {
      // Initialize the region array if it doesn't exist
      if (!teamsByRegion[team.region]) {
        teamsByRegion[team.region] = [];
      }
      
      // Add the team to its region
      teamsByRegion[team.region].push(team);
    });

    // Generate bracket logic
    const bracketEntries: BracketEntry[] = [];

    // Iterate through regions to create bracket entries
    for (const region of Object.keys(teamsByRegion)) {
      const regionTeams = teamsByRegion[region];
      
      // Create matchups for the region
      for (let i = 0; i < regionTeams.length / 2; i++) {
        const team1 = regionTeams[i];
        const team2 = regionTeams[regionTeams.length - 1 - i];
        
        bracketEntries.push({
          round: 1,
          region: region,
          team1Id: team1.id,
          team2Id: team2.id,
          winnerId: null
        });
      }
    }

    // Create bracket entries in the database
    // Use a transaction to handle creating multiple entries
    const createdBracket = await prisma.$transaction(
      bracketEntries.map(entry => 
        prisma.match.create({ data: entry })
      )
    );

    return NextResponse.json({
      message: 'Bracket generated successfully',
      bracketEntries: createdBracket
    }, { status: 201 });

  } catch (error) {
    console.error('Error generating bracket:', error);
    return NextResponse.json(
      { error: 'Failed to generate bracket' },
      { status: 500 }
    );
  }
}
