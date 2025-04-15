// app/api/participants/[id]/match-picks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../../lib/auth";
import { prisma } from '../../../../../lib/prisma';

interface MatchPick {
  matchId: number;
  teamId: number;
}

// GET: Fetch match picks for a participant
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
    const participantId = parseInt(id);
    
    // Fetch participant
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });
    
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }
    
    // Get all match picks for this participant
    const matchPicks = await prisma.matchPick.findMany({
      where: { participantId },
      select: {
        matchId: true,
        teamId: true
      }
    });
    
    return NextResponse.json(matchPicks);
  } catch (error) {
    console.error('Error fetching match picks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch match picks',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT: Update match picks for a participant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      console.log('Unauthorized attempt to update match picks - no session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Correctly await the params
    const { id } = await params;
    const participantId = parseInt(id);
    console.log(`Updating match picks for participant ${participantId}`);
    
    // Parse request body
    const data = await request.json();
    console.log('Received data:', data);
    
    if (!data.picks || !Array.isArray(data.picks)) {
      console.error('Invalid match picks data:', data);
      return NextResponse.json(
        { error: 'Invalid match picks data' },
        { status: 400 }
      );
    }
    
    // Validate participant exists
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });
    
    if (!participant) {
      console.error(`Participant ${participantId} not found`);
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }
    
    // Use MatchPick model for matches
    await prisma.$transaction(async (tx) => {
      // Handle single pick (auto-save case)
      if (data.picks.length === 1) {
        const pick = data.picks[0];
        console.log(`Processing single pick for match ${pick.matchId}, team ${pick.teamId}`);
        
        // Check if a pick for this match already exists
        const existingPick = await tx.matchPick.findUnique({
          where: {
            participantId_matchId: {
              participantId,
              matchId: pick.matchId
            }
          }
        });
        
        if (existingPick) {
          console.log(`Updating existing pick ${existingPick.id}`);
          // Update existing pick
          await tx.matchPick.update({
            where: { id: existingPick.id },
            data: { teamId: pick.teamId }
          });
        } else {
          console.log('Creating new pick');
          // Create new pick
          await tx.matchPick.create({
            data: {
              participantId,
              matchId: pick.matchId,
              teamId: pick.teamId,
              roundScore: 0
            }
          });
        }
      } else {
        // Bulk update (traditional save case)
        const matchIds = data.picks.map((pick: MatchPick) => pick.matchId);
        console.log(`Processing bulk update for matches: ${matchIds.join(', ')}`);
        
        // Delete existing picks for these matches
        await tx.matchPick.deleteMany({
          where: { 
            participantId,
            matchId: { in: matchIds }
          }
        });
        
        // Create new picks
        for (const pick of data.picks) {
          await tx.matchPick.create({
            data: {
              participantId,
              matchId: pick.matchId,
              teamId: pick.teamId,
              roundScore: 0
            }
          });
        }
      }
    });
    
    console.log('Successfully updated match picks');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating match picks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update match picks',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}