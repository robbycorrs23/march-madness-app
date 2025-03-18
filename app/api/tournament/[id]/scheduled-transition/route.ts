// app/api/tournament/[id]/scheduled-transition/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../../lib/auth";
import { prisma } from '../../../../../lib/prisma';

// GET /api/tournament/[id]/scheduled-transition - Get scheduled transition if any
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const tournamentId = parseInt(params.id);
    
    // Find scheduled transition for this tournament
    const scheduledTransition = await prisma.scheduledTransition.findFirst({
      where: { tournamentId }
    });
    
    if (!scheduledTransition) {
      return NextResponse.json(null);
    }
    
    return NextResponse.json(scheduledTransition);
  } catch (error) {
    console.error('Error fetching scheduled transition:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled transition' },
      { status: 500 }
    );
  }
}