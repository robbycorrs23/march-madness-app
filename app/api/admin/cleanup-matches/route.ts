import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';

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

    // Get all tournaments
    const tournaments = await prisma.tournament.findMany();
    let totalDeleted = 0;
    
    for (const tournament of tournaments) {
      console.log(`Processing tournament ${tournament.id} (${tournament.name})`);
      
      // Get all matches for this tournament
      const matches = await prisma.match.findMany({
        where: {
          OR: [
            { team1: { tournamentId: tournament.id } },
            { team2: { tournamentId: tournament.id } }
          ]
        },
        orderBy: [
          { round: 'asc' },
          { region: 'asc' },
          { bracketPosition: 'asc' }
        ]
      });
      
      // Group matches by round, region, and bracket position
      const matchGroups = new Map<string, any[]>();
      
      matches.forEach(match => {
        const key = `${match.round}-${match.region}-${match.bracketPosition}`;
        if (!matchGroups.has(key)) {
          matchGroups.set(key, []);
        }
        matchGroups.get(key)?.push(match);
      });
      
      // Delete duplicate matches
      for (const [key, group] of matchGroups.entries()) {
        if (group.length > 1) {
          console.log(`Found ${group.length} duplicates for ${key}`);
          // Keep the first match and delete the rest
          const [keep, ...deleteThese] = group;
          const result = await prisma.match.deleteMany({
            where: {
              id: {
                in: deleteThese.map(m => m.id)
              }
            }
          });
          totalDeleted += result.count;
        }
      }
    }
    
    return NextResponse.json({
      message: `Successfully deleted ${totalDeleted} duplicate matches`,
      totalDeleted
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to clean up matches' },
      { status: 500 }
    );
  }
} 