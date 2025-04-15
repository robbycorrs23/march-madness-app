// @ts-nocheck
import { PrismaClient } from '@prisma/client';

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

// Define which positions feed into each next round position
const roundFeeds: Record<number, Record<string, [string, string]>> = {
  2: {
    '1': ['1', '2'],   // Winners of 1/16 vs 8/9
    '2': ['3', '4'],   // Winners of 5/12 vs 4/13
    '3': ['5', '6'],   // Winners of 6/11 vs 3/14
    '4': ['7', '8']    // Winners of 7/10 vs 2/15
  },
  3: {
    '1': ['1', '2'],   // Winners of top half
    '2': ['3', '4']    // Winners of bottom half
  },
  4: {
    '1': ['1', '2']    // Winners of Sweet 16
  },
  5: {
    '1': ['E41', 'W41'], // East and West champs
    '2': ['S41', 'M41']  // South and Midwest champs
  },
  6: {
    '1': ['N51', 'N52']  // Final Four winners
  }
};

async function generateNextRound() {
  try {
    console.log('Generating next round matchups...');
    
    // Get all completed matches
    const completedMatches = await db.match.findMany({
      where: {
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

    // Group matches by round
    const matchesByRound = completedMatches.reduce((acc: Record<number, Match[]>, match: Match) => {
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    }, {});

    // Find the highest completed round
    const currentRound = Math.max(...Object.keys(matchesByRound).map(Number));
    const nextRound = currentRound + 1;

    if (!roundFeeds[nextRound]) {
      console.log(`No next round to generate (current round: ${currentRound})`);
      return;
    }

    console.log(`Generating Round ${nextRound} matchups from Round ${currentRound} winners`);

    // For regional rounds (1-4), process each region separately
    if (nextRound <= 4) {
      // Group current round matches by region
      const byRegion = matchesByRound[currentRound].reduce((acc: Record<string, Match[]>, match: Match) => {
        if (!acc[match.region]) {
          acc[match.region] = [];
        }
        acc[match.region].push(match);
        return acc;
      }, {});

      // Process each region
      for (const [region, matches] of Object.entries(byRegion)) {
        const regionCode = regionToCode[region];
        const feeds = roundFeeds[nextRound];

        // Create matches for each position in the next round
        for (const [position, [feed1, feed2]] of Object.entries(feeds)) {
          const match1 = matches.find(m => m.bracketPosition === `${regionCode}${currentRound}${feed1}`);
          const match2 = matches.find(m => m.bracketPosition === `${regionCode}${currentRound}${feed2}`);

          if (match1?.winnerId && match2?.winnerId) {
            const roundMatch = await db.match.create({
              data: {
                round: nextRound,
                region: region,
                team1Id: match1.winnerId,
                team2Id: match2.winnerId,
                completed: false,
                bracketPosition: `${regionCode}${nextRound}${position}`
              }
            });

            console.log(`Created Round ${nextRound} match ${roundMatch.id} in ${region} position ${position}`);
            console.log(`Teams: ${match1.winnerId} vs ${match2.winnerId}`);
          } else {
            console.warn(`Could not find winners for ${region} Round ${nextRound} position ${position}`);
            if (!match1) {
              console.warn(`  Missing match for position ${regionCode}${currentRound}${feed1}`);
            }
            if (!match2) {
              console.warn(`  Missing match for position ${regionCode}${currentRound}${feed2}`);
            }
            if (match1 && !match1.winnerId) {
              console.warn(`  No winner set for match ${match1.id} (${regionCode}${currentRound}${feed1})`);
            }
            if (match2 && !match2.winnerId) {
              console.warn(`  No winner set for match ${match2.id} (${regionCode}${currentRound}${feed2})`);
            }
          }
        }
      }
    } else {
      // For national rounds (5-6), process all regions together
      const feeds = roundFeeds[nextRound];
      
      for (const [position, [feed1, feed2]] of Object.entries(feeds)) {
        const match1 = matchesByRound[currentRound].find(m => m.bracketPosition === feed1);
        const match2 = matchesByRound[currentRound].find(m => m.bracketPosition === feed2);

        if (match1?.winnerId && match2?.winnerId) {
          const roundMatch = await db.match.create({
            data: {
              round: nextRound,
              region: 'National',
              team1Id: match1.winnerId,
              team2Id: match2.winnerId,
              completed: false,
              bracketPosition: `N${nextRound}${position}`
            }
          });

          console.log(`Created Round ${nextRound} match ${roundMatch.id} in National position ${position}`);
          console.log(`Teams: ${match1.winnerId} vs ${match2.winnerId}`);
        } else {
          console.warn(`Could not find winners for Round ${nextRound} position ${position}`);
          if (!match1) {
            console.warn(`  Missing match for position ${feed1}`);
          }
          if (!match2) {
            console.warn(`  Missing match for position ${feed2}`);
          }
          if (match1 && !match1.winnerId) {
            console.warn(`  No winner set for match ${match1.id} (${feed1})`);
          }
          if (match2 && !match2.winnerId) {
            console.warn(`  No winner set for match ${match2.id} (${feed2})`);
          }
        }
      }
    }

    console.log(`Successfully generated Round ${nextRound} matchups`);

  } catch (error) {
    console.error('Error generating next round:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the generation
generateNextRound(); 