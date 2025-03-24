import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../lib/auth";
import { prisma } from '../../../lib/prisma';

// Define a type for the team input
type TeamInput = {
  name: string;
  seed: number;
  region: string;
};

type TeamsRequestData = {
  teams: TeamInput[];
  tournamentId: number;
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
    const data = await request.json() as TeamsRequestData;
    
    // Validate input
    if (!data.teams || !Array.isArray(data.teams) || typeof data.tournamentId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid team data or missing/invalid tournament ID' },
        { status: 400 }
      );
    }
    
    // First, delete all existing teams for this tournament
    await prisma.team.deleteMany({
      where: { 
        tournamentId: data.tournamentId
      }
    });
    
    // Then create all teams from the current state
    const createdTeams = await prisma.team.createMany({
      data: data.teams.map((team: TeamInput) => ({
        name: team.name,
        seed: team.seed,
        region: team.region,
        tournamentId: data.tournamentId,
        eliminated: false
      })),
    });
    
    return NextResponse.json(createdTeams, { status: 201 });
  } catch (error) {
    console.error('Error creating teams:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to create teams', 
          details: error.message,
          stack: error.stack 
        },
        { status: 500 }
      );
    }
    
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('id');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }
    
    const idNumber = parseInt(teamId);
    
    // Begin a transaction to ensure all operations complete or none do
    await prisma.$transaction(async (tx) => {
      // 1. Delete related GamePicks
      await tx.gamePick.deleteMany({
        where: { teamId: idNumber }
      });
      
      // 2. Delete related FinalFourPicks
      await tx.finalFourPick.deleteMany({
        where: { teamId: idNumber }
      });
      
      // 3. Delete related FinalsPicks
      await tx.finalsPick.deleteMany({
        where: { teamId: idNumber }
      });
      
      // 4. Delete related ChampionPicks
      await tx.championPick.deleteMany({
        where: { teamId: idNumber }
      });
      
      // 5. Delete related CinderellaPicks
      await tx.cinderellaPick.deleteMany({
        where: { teamId: idNumber }
      });
      
      // 6. Update Games where this team is the winner (set winnerId to null)
      await tx.game.updateMany({
        where: { winnerId: idNumber },
        data: { winnerId: null }
      });
      
      // 7. Delete Games where this team is team1 or team2
      await tx.game.deleteMany({
        where: {
          OR: [
            { team1Id: idNumber },
            { team2Id: idNumber }
          ]
        }
      });
      
      // 8. Update Matches where this team is the winner (set winnerId to null)
      await tx.match.updateMany({
        where: { winnerId: idNumber },
        data: { winnerId: null }
      });
      
      // 9. Delete Matches where this team is team1 or team2
      await tx.match.deleteMany({
        where: {
          OR: [
            { team1Id: idNumber },
            { team2Id: idNumber }
          ]
        }
      });
      
      // 10. Finally, delete the team
      await tx.team.delete({
        where: { id: idNumber }
      });
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
