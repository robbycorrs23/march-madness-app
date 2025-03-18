import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';

// Define type for Match object
interface Match {
  id: number;
  region: string;
  round: number;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
}

// Define type for matches grouped by region
interface MatchesByRegion {
  [region: string]: Match[];
}

// Define type for region winners
interface RegionWinners {
  [region: string]: number;
}

// Mapping of round names to numbers
const ROUND_MAP: { [key: string]: number } = {
  'Round of 64': 1,
  'Round of 32': 2,
  'Sweet 16': 3,
  'Elite 8': 4,
  'Final Four': 5,
  'Championship': 6
};

// Reverse mapping of round numbers to names
const ROUND_NAME_MAP: { [key: number]: string } = Object.fromEntries(
  Object.entries(ROUND_MAP).map(([key, value]) => [value, key])
);

// POST /api/tournament/generate-next-round - Generate next round matches (admin only)
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
    const { tournamentId, currentRound } = data;
    
    if (!tournamentId || !currentRound) {
      return NextResponse.json(
        { error: 'Tournament ID and current round are required' },
        { status: 400 }
      );
    }
    
    // Determine next round
    const currentRoundNumber = ROUND_MAP[currentRound];
    const nextRoundNumber = currentRoundNumber + 1;
    const nextRound = ROUND_NAME_MAP[nextRoundNumber];
    
    if (!nextRound) {
      return NextResponse.json(
        { error: 'Invalid current round or no next round available' },
        { status: 400 }
      );
    }
    
    // Get current round matches with winners
    const currentRoundMatches = await prisma.match.findMany({
      where: {
        round: currentRoundNumber,
        winnerId: { not: null }
      },
      orderBy: [
        { region: 'asc' },
        { id: 'asc' }
      ]
    });
    
    if (currentRoundMatches.length === 0) {
      return NextResponse.json(
        { error: 'No matches with winners found for the current round' },
        { status: 400 }
      );
    }
    
    // Generate next round matches
    const nextRoundMatches = [];
    
    if (nextRoundNumber <= 5) { // Up to Final Four
      // Group matches by region
      const matchesByRegion: MatchesByRegion = {};
      currentRoundMatches.forEach(match => {
        if (!matchesByRegion[match.region]) {
          matchesByRegion[match.region] = [];
        }
        matchesByRegion[match.region].push(match);
      });
      
      // Create matchups
      for (const region in matchesByRegion) {
        const regionMatches = matchesByRegion[region];
        
        // Pair up winners
        for (let i = 0; i < regionMatches.length; i += 2) {
          const match1 = regionMatches[i];
          const match2 = i + 1 < regionMatches.length ? regionMatches[i + 1] : null;
          
          if (match1 && match2 && match1.winnerId && match2.winnerId) {
            nextRoundMatches.push({
              round: nextRoundNumber,
              region: nextRoundNumber === 5 ? 'Final' : region,
              team1Id: match1.winnerId,
              team2Id: match2.winnerId
            });
          }
        }
      }
    } else if (nextRoundNumber === 6) { // Championship
      // Create championship match from Final Four winners
      if (currentRoundMatches.length === 2 &&
          currentRoundMatches[0].winnerId &&
          currentRoundMatches[1].winnerId) {
        nextRoundMatches.push({
          round: nextRoundNumber,
          region: 'Final',
          team1Id: currentRoundMatches[0].winnerId,
          team2Id: currentRoundMatches[1].winnerId
        });
      }
    }
    
    if (nextRoundMatches.length === 0) {
      return NextResponse.json(
        { error: 'Could not generate any matches for the next round' },
        { status: 400 }
      );
    }
    
    // Create matches in the database
    const createdMatches = await prisma.match.createMany({
      data: nextRoundMatches
    });
    
    return NextResponse.json({
      message: `Created ${createdMatches.count} matches for the ${nextRound}`
    });
  } catch (error) {
    console.error('Error generating next round:', error);
    return NextResponse.json(
      { error: 'Failed to generate next round matches' },
      { status: 500 }
    );
  }
}