// app/api/tournament/cancel-transition/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';

// POST /api/tournament/cancel-transition - Cancel a scheduled round transition (admin only)
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
    const { tournamentId } = data;
    
    if (!tournamentId) {
      return NextResponse.json(
        { error: 'Missing tournament ID' },
        { status: 400 }
      );
    }
    
    // Delete the scheduled transition
    await prisma.scheduledTransition.deleteMany({
      where: { tournamentId: parseInt(tournamentId) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling transition:', error);
    return NextResponse.json(
      { error: 'Failed to cancel scheduled transition' },
      { status: 500 }
    );
  }
}