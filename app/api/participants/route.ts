import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../lib/prisma';

// GET /api/participants - Get all participants (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the current tournament
    const tournament = await prisma.tournament.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    if (!tournament) {
      return NextResponse.json([]);
    }
    
    // Get participants for the tournament
    const participants = await prisma.participant.findMany({
      where: {
        tournamentId: tournament.id,
      },
      orderBy: {
        totalScore: 'desc',
      },
    });
    
    return NextResponse.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

// POST /api/participants - Create new participant
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Get the current tournament
    const tournament = await prisma.tournament.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    if (!tournament) {
      return NextResponse.json(
        { error: 'No tournament found' },
        { status: 404 }
      );
    }
    
    // Check if participant already exists
    const existingParticipant = await prisma.participant.findFirst({
      where: {
        email: data.email,
        tournamentId: tournament.id,
      },
    });
    
    if (existingParticipant) {
      return NextResponse.json(
        { error: 'A participant with this email already exists' },
        { status: 400 }
      );
    }
    
    // Create participant
    const participant = await prisma.participant.create({
      data: {
        name: data.name,
        email: data.email,
        paid: data.paid || false,
        tournamentId: tournament.id,
      },
    });
    
    return NextResponse.json(participant);
  } catch (error) {
    console.error('Error creating participant:', error);
    return NextResponse.json(
      { error: 'Failed to create participant' },
      { status: 500 }
    );
  }
}
