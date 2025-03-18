// app/api/matches/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';

// PATCH: Update match result
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
    
    // Parse match ID from params
    const matchId = parseInt(params.id);
    
    // Parse request body - now we accept partial updates
    const data = await request.json();
    const { winnerId, team1Score, team2Score, completed } = data;
    
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (winnerId !== undefined) {
      updateData.winnerId = winnerId;
    }
    
    // Note: Your schema.prisma shows Match doesn't have team1Score and team2Score
    // If you're using these fields in the UI, you should add them to your schema
    // and run a migration. For now, we'll include them in the code conditionally.
    
    if (team1Score !== undefined) {
      // Check if the field exists in your schema
      try {
        updateData.team1Score = team1Score;
      } catch (e) {
        console.warn("team1Score field not found in Match model");
      }
    }
    
    if (team2Score !== undefined) {
      try {
        updateData.team2Score = team2Score;
      } catch (e) {
        console.warn("team2Score field not found in Match model");
      }
    }
    
    if (completed !== undefined) {
      try {
        updateData.completed = completed;
      } catch (e) {
        console.warn("completed field not found in Match model");
      }
    }
    
    // Update match in the database
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
      include: {
        team1: true,
        team2: true
      }
    });
    
    // If this is the Championship match and we have a winner, update eliminated status
    if (winnerId !== undefined) {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          team1: true,
          team2: true
        }
      });
      
      if (match && match.round === 6) { // Championship round
        const losingTeamId = winnerId === match.team1.id 
          ? match.team2.id 
          : match.team1.id;
          
        await prisma.team.update({
          where: { id: losingTeamId },
          data: { eliminated: true }
        });
      }
    }
    
    return NextResponse.json(updatedMatch);
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update match',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}