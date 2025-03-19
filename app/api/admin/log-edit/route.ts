// app/api/admin/log-edit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';
import { logAdminEdit } from '../../../../lib/adminEditLogger';

// POST /api/admin/log-edit - Log admin edits to picks post-tournament start
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const data = await req.json();
    const { participantId, matchId, teamId, previousTeamId } = data;
    
    // Get current tournament to check its state
    const tournament = await prisma.tournament.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    
    if (!tournament) {
      return NextResponse.json(
        { error: 'No tournament found' },
        { status: 404 }
      );
    }
    
    // Log the edit
    await logAdminEdit({
      adminId: session.user.id || 'unknown',
      adminEmail: session.user.email || 'unknown',
      participantId,
      matchId,
      teamId,
      previousTeamId,
      tournamentRound: tournament.currentRound,
      timestamp: new Date()
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging admin edit:', error);
    return NextResponse.json(
      { error: 'Failed to log admin edit' },
      { status: 500 }
    );
  }
}