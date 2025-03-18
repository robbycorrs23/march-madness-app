// app/api/tournament/schedule-transition/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';

// POST /api/tournament/schedule-transition - Schedule a round transition (admin only)
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
    const { tournamentId, fromRound, toRound, scheduledTime } = data;
    
    if (!tournamentId || !fromRound || !toRound || !scheduledTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Parse the scheduled time
    const scheduledDate = new Date(scheduledTime);
    
    // Make sure it's in the future
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }
    
    // Check if there's an existing scheduled transition
    const existingTransition = await prisma.scheduledTransition.findFirst({
      where: { tournamentId: parseInt(tournamentId) }
    });
    
    // Update or create a scheduled transition
    let scheduledTransition;
    if (existingTransition) {
      scheduledTransition = await prisma.scheduledTransition.update({
        where: { id: existingTransition.id },
        data: {
          fromRound,
          toRound,
          scheduledTime: scheduledDate
        }
      });
    } else {
      scheduledTransition = await prisma.scheduledTransition.create({
        data: {
          tournamentId: parseInt(tournamentId),
          fromRound,
          toRound,
          scheduledTime: scheduledDate
        }
      });
    }
    
    return NextResponse.json(scheduledTransition);
  } catch (error) {
    console.error('Error scheduling transition:', error);
    return NextResponse.json(
      { error: 'Failed to schedule round transition' },
      { status: 500 }
    );
  }
}