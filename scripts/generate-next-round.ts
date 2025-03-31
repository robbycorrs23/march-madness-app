// @ts-nocheck
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

interface Team {
  id: number;
  name: string;
  seed: number;
  region?: string;
  eliminated?: boolean;
}

interface Match {
  id: number;
  round: number;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
  bracketPosition: string | null;
  completed: boolean;
  winner?: Team;
  team1?: Team;
  team2?: Team;
}

// Define the bracket structure - which positions advance to which
interface AdvancementMap {
  [key: string]: string;
}

// Map showing how winners advance to next round
// Format: "RegionRoundPosition" -> "NextRegionRoundPosition"
const advancementMap: AdvancementMap = {
  // Round 1 to Round 2
  "E11": "E21", "E12": "E21", // 1/16 vs 8/9 winners to R2P1
  "E13": "E22", "E14": "E22", // 5/12 vs 4/13 winners to R2P2
  "E15": "E23", "E16": "E23", // 6/11 vs 3/14 winners to R2P3
  "E17": "E24", "E18": "E24", // 7/10 vs 2/15 winners to R2P4
  
  "W11": "W21", "W12": "W21",
  "W13": "W22", "W14": "W22",
  "W15": "W23", "W16": "W23",
  "W17": "W24", "W18": "W24",
  
  "S11": "S21", "S12": "S21",
  "S13": "S22", "S14": "S22",
  "S15": "S23", "S16": "S23",
  "S17": "S24", "S18": "S24",
  
  "M11": "M21", "M12": "M21",
  "M13": "M22", "M14": "M22",
  "M15": "M23", "M16": "M23",
  "M17": "M24", "M18": "M24",
  
  // Round 2 to Sweet 16
  "E21": "E31", "E22": "E31", // Top half to S16P1
  "E23": "E32", "E24": "E32", // Bottom half to S16P2
  
  "W21": "W31", "W22": "W31",
  "W23": "W32", "W24": "W32",
  
  "S21": "S31", "S22": "S31",
  "S23": "S32", "S24": "S32",
  
  "M21": "M31", "M22": "M31",
  "M23": "M32", "M24": "M32",
  
  // Sweet 16 to Elite 8
  "E31": "E41", "E32": "E41",
  "W31": "W41", "W32": "W41",
  "S31": "S41", "S32": "S41",
  "M31": "M41", "M32": "M41",
  
  // Elite 8 to Final Four
  "E41": "N51", // East champ to first Final Four match
  "W41": "N51", // West champ to first Final Four match
  "S41": "N52", // South champ to second Final Four match
  "M41": "N52", // Midwest champ to second Final Four match
  
  // Final Four to Championship
  "N51": "N61", "N52": "N61"
};

// Map region codes to region names
const regionCodes: Record<string, string> = {
  "E": "East",
  "W": "West",
  "S": "South",
  "M": "Midwest",
  "N": "National"
};

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

async function generateNextRound() {
  try {
    console.log('Generating next round matchups...');
    
    // Get all completed Round 1 matches
    const round1Matches = await db.match.findMany({
      where: {
        round: 1,
        completed: true,
        winnerId: {
          not: null
        }
      },
      include: {
        team1: true,
        team2: true
      }
    });

    console.log(`Found ${round1Matches.length} completed Round 1 matches`);

    // Group Round 1 matches by region
    const round1ByRegion = round1Matches.reduce((acc: Record<string, Match[]>, match: Match) => {
      if (!acc[match.region]) {
        acc[match.region] = [];
      }
      acc[match.region].push(match);
      return acc;
    }, {});

    // Generate Round 2 matches for each region
    for (const [region, matches] of Object.entries(round1ByRegion)) {
      const regionCode = regionToCode[region];
      
      // Create 4 Round 2 matches for each region
      for (let position = 1; position <= 4; position++) {
        const feeds = round2Feeds[position.toString()];
        if (!feeds) continue;

        const [feed1, feed2] = feeds;
        
        // Find the corresponding Round 1 matches
        const match1 = matches.find((m: Match) => m.bracketPosition === `${regionCode}1${feed1}`);
        const match2 = matches.find((m: Match) => m.bracketPosition === `${regionCode}1${feed2}`);

        if (match1?.winnerId && match2?.winnerId) {
          // Create the Round 2 match
          const round2Match = await db.match.create({
            data: {
              round: 2,
              region: region,
              team1Id: match1.winnerId,
              team2Id: match2.winnerId,
              completed: false,
              bracketPosition: `${regionCode}2${position}`
            }
          });

          console.log(`Created Round 2 match ${round2Match.id} in ${region} position ${position}`);
          console.log(`Teams: ${match1.winnerId} vs ${match2.winnerId}`);
        } else {
          console.warn(`Could not find winners for ${region} Round 2 position ${position}`);
          if (!match1) {
            console.warn(`  Missing match for position ${regionCode}1${feed1}`);
          }
          if (!match2) {
            console.warn(`  Missing match for position ${regionCode}1${feed2}`);
          }
          if (match1 && !match1.winnerId) {
            console.warn(`  No winner set for match ${match1.id} (${regionCode}1${feed1})`);
          }
          if (match2 && !match2.winnerId) {
            console.warn(`  No winner set for match ${match2.id} (${regionCode}1${feed2})`);
          }
        }
      }
    }

    console.log('Successfully generated Round 2 matchups');

  } catch (error) {
    console.error('Error generating next round:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the generation
generateNextRound(); 