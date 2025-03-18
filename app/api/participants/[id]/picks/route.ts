// app/api/participants/[id]/picks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../../lib/auth";
import { prisma } from '../../../../../lib/prisma';

// GET: Fetch all picks for a participant
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
    
    // Fetch participant data
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });
    
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }
    
    // Fetch pre-tournament picks
    const preTournamentPick = await prisma.preTournamentPick.findUnique({
      where: { participantId },
      include: {
        finalFourPicks: true,
        finalsPicks: true,
        championPick: true,
        cinderellaPicks: true,
      },
    });
    
    // Fetch game picks
    const gamePicks = await prisma.gamePick.findMany({
      where: { participantId },
    });
    
    return NextResponse.json({
      participant,
      preTournamentPick,
      gamePicks,
    });
  } catch (error) {
    console.error('Error fetching participant picks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participant picks' },
      { status: 500 }
    );
  }
}

// PUT: Update all picks for a participant
export async function PUT(
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
    const data = await request.json();
    
    // Validate participant exists
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });
    
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }
    
    // Start a transaction to update all picks
    await prisma.$transaction(async (tx) => {
      // Handle pre-tournament picks
      if (data.preTournamentPick) {
        // Get or create pre-tournament pick
        let preTournamentPick = await tx.preTournamentPick.findUnique({
          where: { participantId },
        });
        
        if (!preTournamentPick) {
          preTournamentPick = await tx.preTournamentPick.create({
            data: {
              participantId,
              score: 0,
            },
          });
        }
        
        const preTournamentPickId = preTournamentPick.id;
        
        // Update Final Four picks
        if (data.preTournamentPick.finalFourPicks) {
          // Delete existing picks
          await tx.finalFourPick.deleteMany({
            where: { preTournamentPickId },
          });
          
          // Create new picks
          for (const pick of data.preTournamentPick.finalFourPicks) {
            if (pick.teamId) {
              await tx.finalFourPick.create({
                data: {
                  preTournamentPickId,
                  teamId: pick.teamId,
                },
              });
            }
          }
        }
        
        // Update Finals picks
        if (data.preTournamentPick.finalsPicks) {
          // Delete existing picks
          await tx.finalsPick.deleteMany({
            where: { preTournamentPickId },
          });
          
          // Create new picks
          for (const pick of data.preTournamentPick.finalsPicks) {
            if (pick.teamId) {
              await tx.finalsPick.create({
                data: {
                  preTournamentPickId,
                  teamId: pick.teamId,
                },
              });
            }
          }
        }
        
        // Update Champion pick
        if (data.preTournamentPick.championPick?.teamId) {
          // Delete existing pick
          await tx.championPick.deleteMany({
            where: { preTournamentPickId },
          });
          
          // Create new pick
          await tx.championPick.create({
            data: {
              preTournamentPickId,
              teamId: data.preTournamentPick.championPick.teamId,
            },
          });
        }
        
        // Update Cinderella picks
        if (data.preTournamentPick.cinderellaPicks) {
          // Delete existing picks
          await tx.cinderellaPick.deleteMany({
            where: { preTournamentPickId },
          });
          
          // Create new picks
          for (const pick of data.preTournamentPick.cinderellaPicks) {
            if (pick.teamId) {
              await tx.cinderellaPick.create({
                data: {
                  preTournamentPickId,
                  teamId: pick.teamId,
                },
              });
            }
          }
        }
      }
      
      // Handle game picks
      if (data.gamePicks && Array.isArray(data.gamePicks)) {
        for (const pick of data.gamePicks) {
          if (pick.gameId && pick.teamId) {
            // Check if pick already exists
            const existingPick = await tx.gamePick.findUnique({
              where: {
                participantId_gameId: {
                  participantId,
                  gameId: pick.gameId,
                },
              },
            });
            
            if (existingPick) {
              // Update existing pick
              await tx.gamePick.update({
                where: { id: existingPick.id },
                data: { teamId: pick.teamId },
              });
            } else {
              // Create new pick
              await tx.gamePick.create({
                data: {
                  participantId,
                  gameId: pick.gameId,
                  teamId: pick.teamId,
                  roundScore: 0,
                },
              });
            }
          }
        }
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating participant picks:', error);
    return NextResponse.json(
      { error: 'Failed to update participant picks' },
      { status: 500 }
    );
  }
}