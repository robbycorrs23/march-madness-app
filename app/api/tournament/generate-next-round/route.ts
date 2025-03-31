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
  bracketPosition: string | null;
}

// Define type for matches grouped by region
interface MatchesByRegion {
  [region: string]: Match[];
}

// Map region names to region codes
const regionToCode: Record<string, string> = {
  'East': 'E',
  'West': 'W',
  'South': 'S',
  'Midwest': 'M',
  'National': 'N'
};

// Define which Round 1 matchups feed into each Round 2 matchup
const round2Feeds: Record<string, [string, string]> = {
  '1': ['1', '2'],   // Winners of 1/16 vs 8/9
  '2': ['3', '4'],   // Winners of 5/12 vs 4/13
  '3': ['5', '6'],   // Winners of 6/11 vs 3/14
  '4': ['7', '8']    // Winners of 7/10 vs 2/15
};

// Define which Round 2 matchups feed into each Sweet 16 matchup
const round3Feeds: Record<string, [string, string]> = {
  '1': ['1', '2'],   // Top half of region
  '2': ['3', '4']    // Bottom half of region
};

// Define which Sweet 16 matchups feed into each Elite 8 matchup
const round4Feeds: Record<string, [string, string]> = {
  '1': ['1', '2']    // Region final
};

// Define which Elite 8 matchups feed into each Final Four matchup
const round5Feeds: Record<string, [string, string]> = {
  '1': ['E41', 'W41'],  // East vs West
  '2': ['S41', 'M41']   // South vs Midwest
};

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
    
    // Group matches by region
    const matchesByRegion: MatchesByRegion = {};
    currentRoundMatches.forEach(match => {
      if (!matchesByRegion[match.region]) {
        matchesByRegion[match.region] = [];
      }
      matchesByRegion[match.region].push(match);
    });
    
    // Handle each round differently based on the bracket structure
    switch (nextRoundNumber) {
      case 2: // Round of 32
        // Generate Round 2 matches for each region
        for (const [region, matches] of Object.entries(matchesByRegion)) {
          const regionCode = regionToCode[region];
          
          // Create 4 Round 2 matches for each region
          for (let position = 1; position <= 4; position++) {
            const feeds = round2Feeds[position.toString()];
            if (!feeds) continue;

            const [feed1, feed2] = feeds;
            
            // Find the corresponding Round 1 matches
            const match1 = matches.find(m => m.bracketPosition === `${regionCode}1${feed1}`);
            const match2 = matches.find(m => m.bracketPosition === `${regionCode}1${feed2}`);

            if (match1?.winnerId && match2?.winnerId) {
              nextRoundMatches.push({
                round: nextRoundNumber,
                region: region,
                team1Id: match1.winnerId,
                team2Id: match2.winnerId,
                bracketPosition: `${regionCode}2${position}`
              });
            }
          }
        }
        break;
        
      case 3: // Sweet 16
        // Generate Sweet 16 matches for each region
        for (const [region, matches] of Object.entries(matchesByRegion)) {
          const regionCode = regionToCode[region];
          
          // Create 2 Sweet 16 matches for each region
          for (let position = 1; position <= 2; position++) {
            const feeds = round3Feeds[position.toString()];
            if (!feeds) continue;

            const [feed1, feed2] = feeds;
            
            // Find the corresponding Round 2 matches
            const match1 = matches.find(m => m.bracketPosition === `${regionCode}2${feed1}`);
            const match2 = matches.find(m => m.bracketPosition === `${regionCode}2${feed2}`);

            if (match1?.winnerId && match2?.winnerId) {
              nextRoundMatches.push({
                round: nextRoundNumber,
                region: region,
                team1Id: match1.winnerId,
                team2Id: match2.winnerId,
                bracketPosition: `${regionCode}3${position}`
              });
            }
          }
        }
        break;
        
      case 4: // Elite 8
        // Generate Elite 8 matches for each region
        for (const [region, matches] of Object.entries(matchesByRegion)) {
          const regionCode = regionToCode[region];
          
          // Create 1 Elite 8 match for each region
          const feeds = round4Feeds['1'];
          if (!feeds) continue;

          const [feed1, feed2] = feeds;
          
          // Find the corresponding Sweet 16 matches
          const match1 = matches.find(m => m.bracketPosition === `${regionCode}3${feed1}`);
          const match2 = matches.find(m => m.bracketPosition === `${regionCode}3${feed2}`);

          if (match1?.winnerId && match2?.winnerId) {
            nextRoundMatches.push({
              round: nextRoundNumber,
              region: region,
              team1Id: match1.winnerId,
              team2Id: match2.winnerId,
              bracketPosition: `${regionCode}41`
            });
          }
        }
        break;
        
      case 5: // Final Four
        // Generate Final Four matches from Elite 8 winners
        const feeds = round5Feeds['1'];
        if (!feeds) break;

        const [feed1, feed2] = feeds;
        
        // Find the corresponding Elite 8 matches
        const match1 = currentRoundMatches.find(m => m.bracketPosition === feed1);
        const match2 = currentRoundMatches.find(m => m.bracketPosition === feed2);

        if (match1?.winnerId && match2?.winnerId) {
          nextRoundMatches.push({
            round: nextRoundNumber,
            region: 'National',
            team1Id: match1.winnerId,
            team2Id: match2.winnerId,
            bracketPosition: 'N51'
          });
        }

        // Second Final Four match
        const feeds2 = round5Feeds['2'];
        if (!feeds2) break;

        const [feed3, feed4] = feeds2;
        
        // Find the corresponding Elite 8 matches
        const match3 = currentRoundMatches.find(m => m.bracketPosition === feed3);
        const match4 = currentRoundMatches.find(m => m.bracketPosition === feed4);

        if (match3?.winnerId && match4?.winnerId) {
          nextRoundMatches.push({
            round: nextRoundNumber,
            region: 'National',
            team1Id: match3.winnerId,
            team2Id: match4.winnerId,
            bracketPosition: 'N52'
          });
        }
        break;
        
      case 6: // Championship
        // Generate Championship match from Final Four winners
        const championshipMatch1 = currentRoundMatches.find(m => m.bracketPosition === 'N51');
        const championshipMatch2 = currentRoundMatches.find(m => m.bracketPosition === 'N52');

        if (championshipMatch1?.winnerId && championshipMatch2?.winnerId) {
          nextRoundMatches.push({
            round: nextRoundNumber,
            region: 'National',
            team1Id: championshipMatch1.winnerId,
            team2Id: championshipMatch2.winnerId,
            bracketPosition: 'N61'
          });
        }
        break;
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