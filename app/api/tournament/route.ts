import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../lib/auth";
import { prisma } from '../../../lib/prisma';

// GET /api/tournament - Get current tournament
export async function GET(req: NextRequest) {
  try {
    // Get the most recent tournament, explicitly selecting fields
    const tournament = await prisma.tournament.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        year: true,
        entryFee: true,
        currentRound: true,
        regions: true,
        createdAt: true,
        updatedAt: true
        // Excluding managedById which doesn't exist in the database
      }
    });
    
    if (!tournament) {
      return NextResponse.json(
        { message: 'No tournament found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament' },
      { status: 500 }
    );
  }
}

// POST /api/tournament - Create new tournament (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const data = await req.json();
    
    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        year: data.year,
        entryFee: data.entryFee,
        currentRound: data.currentRound,
        regions: data.regions,
      },
    });
    
    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}

// PUT /api/tournament - Update tournament (admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const data = await req.json();
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'Tournament ID is required' },
        { status: 400 }
      );
    }
    
    // Update tournament
    const tournament = await prisma.tournament.update({
      where: { id: data.id },
      data: {
        name: data.name,
        year: data.year,
        entryFee: data.entryFee,
        currentRound: data.currentRound,
        regions: data.regions,
      },
    });
    
    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}