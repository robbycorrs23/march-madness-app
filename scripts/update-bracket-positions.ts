// @ts-nocheck
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Define prisma types
type MatchWithTeams = {
  id: number;
  round: number;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
  bracketPosition?: string | null;
  completed: boolean;
  team1Score?: number | null;
  team2Score?: number | null;
  team1?: {
    id: number;
    name: string;
    seed: number;
  };
  team2?: {
    id: number;
    name: string;
    seed: number;
  };
}

// Map region names to region codes
const regionToCode: Record<string, string> = {
  'East': 'E',
  'West': 'W',
  'South': 'S',
  'Midwest': 'M',
  'National': 'N'
};

// Get position for Round 1 match based on seeds
function getPositionForRound1Match(match: MatchWithTeams): number {
  if (!match.team1 || !match.team2) return 0;
  
  const seed1 = match.team1.seed;
  const seed2 = match.team2.seed;
  
  // First determine which seed pair this match represents
  if ((seed1 === 1 && seed2 === 16) || (seed1 === 16 && seed2 === 1)) return 1;
  if ((seed1 === 8 && seed2 === 9) || (seed1 === 9 && seed2 === 8)) return 2;
  if ((seed1 === 5 && seed2 === 12) || (seed1 === 12 && seed2 === 5)) return 3;
  if ((seed1 === 4 && seed2 === 13) || (seed1 === 13 && seed2 === 4)) return 4;
  if ((seed1 === 6 && seed2 === 11) || (seed1 === 11 && seed2 === 6)) return 5;
  if ((seed1 === 3 && seed2 === 14) || (seed1 === 14 && seed2 === 3)) return 6;
  if ((seed1 === 7 && seed2 === 10) || (seed1 === 10 && seed2 === 7)) return 7;
  if ((seed1 === 2 && seed2 === 15) || (seed1 === 15 && seed2 === 2)) return 8;
  
  return 0; // Invalid position
}

async function updateBracketPositions() {
  try {
    console.log('Updating bracket positions for all matches...');
    
    // Get all matches with teams
    const matches = await prisma.match.findMany({
      include: {
        team1: true,
        team2: true
      },
      orderBy: [
        { round: 'asc' },
        { region: 'asc' }
      ]
    });
    
    console.log(`Found ${matches.length} matches to update`);
    
    // Group matches by round
    const matchesByRound = matches.reduce((acc: Record<number, MatchWithTeams[]>, match: MatchWithTeams) => {
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    }, {});
    
    const updates = [];
    
    // Process Round 1 matches - positions based on seeds
    if (matchesByRound[1]) {
      console.log(`Processing ${matchesByRound[1].length} Round 1 matches`);
      
      for (const match of matchesByRound[1]) {
        const regionCode = regionToCode[match.region];
        const position = getPositionForRound1Match(match);
        
        if (position > 0) {
          const bracketPosition = `${regionCode}1${position}`;
          console.log(`Match ${match.id}: ${match.region} - Setting position to ${bracketPosition}`);
          
          updates.push(
            prisma.match.update({
              where: { id: match.id },
              data: { bracketPosition }
            })
          );
        } else {
          console.warn(`Could not determine position for Round 1 match ${match.id}`);
        }
      }
    }
    
    // Process Round 2 matches - 4 positions per region
    if (matchesByRound[2]) {
      console.log(`Processing ${matchesByRound[2].length} Round 2 matches`);
      
      // Group by region first
      const byRegion = matchesByRound[2].reduce((acc: Record<string, MatchWithTeams[]>, match: MatchWithTeams) => {
        if (!acc[match.region]) {
          acc[match.region] = [];
        }
        acc[match.region].push(match);
        return acc;
      }, {});
      
      // Each region should have 4 matches, assign positions 1-4
      for (const [region, regionMatches] of Object.entries(byRegion) as [string, MatchWithTeams[]][]) {
        const regionCode = regionToCode[region];
        
        // The standard ordering for Round 2 is:
        // Position 1: Winners of seed matches 1/16 vs 8/9
        // Position 2: Winners of seed matches 5/12 vs 4/13
        // Position 3: Winners of seed matches 6/11 vs 3/14
        // Position 4: Winners of seed matches 7/10 vs 2/15
        
        for (let i = 0; i < regionMatches.length; i++) {
          const match = regionMatches[i];
          const positionNumber = i + 1;
          const bracketPosition = `${regionCode}2${positionNumber}`;
          
          console.log(`Match ${match.id}: ${match.region} - Setting position to ${bracketPosition}`);
          
          updates.push(
            prisma.match.update({
              where: { id: match.id },
              data: { bracketPosition }
            })
          );
        }
      }
    }
    
    // Process Sweet 16 (Round 3) matches - 2 positions per region
    if (matchesByRound[3]) {
      console.log(`Processing ${matchesByRound[3].length} Round 3 matches`);
      
      // Group by region
      const byRegion = matchesByRound[3].reduce((acc: Record<string, MatchWithTeams[]>, match: MatchWithTeams) => {
        if (!acc[match.region]) {
          acc[match.region] = [];
        }
        acc[match.region].push(match);
        return acc;
      }, {});
      
      // Each region should have 2 matches, assign positions 1-2
      for (const [region, regionMatches] of Object.entries(byRegion) as [string, MatchWithTeams[]][]) {
        const regionCode = regionToCode[region];
        
        for (let i = 0; i < regionMatches.length; i++) {
          const match = regionMatches[i];
          const positionNumber = i + 1;
          const bracketPosition = `${regionCode}3${positionNumber}`;
          
          console.log(`Match ${match.id}: ${match.region} - Setting position to ${bracketPosition}`);
          
          updates.push(
            prisma.match.update({
              where: { id: match.id },
              data: { bracketPosition }
            })
          );
        }
      }
    }
    
    // Process Elite 8 (Round 4) matches - 1 position per region
    if (matchesByRound[4]) {
      console.log(`Processing ${matchesByRound[4].length} Round 4 matches`);
      
      for (const match of matchesByRound[4]) {
        const regionCode = regionToCode[match.region];
        const bracketPosition = `${regionCode}41`;
        
        console.log(`Match ${match.id}: ${match.region} - Setting position to ${bracketPosition}`);
        
        updates.push(
          prisma.match.update({
            where: { id: match.id },
            data: { bracketPosition }
          })
        );
      }
    }
    
    // Process Final Four (Round 5) matches - 2 positions (National)
    if (matchesByRound[5]) {
      console.log(`Processing ${matchesByRound[5].length} Final Four matches`);
      
      for (let i = 0; i < matchesByRound[5].length; i++) {
        const match = matchesByRound[5][i];
        const positionNumber = i + 1;
        const bracketPosition = `N5${positionNumber}`;
        
        console.log(`Match ${match.id}: ${match.region} - Setting position to ${bracketPosition}`);
        
        updates.push(
          prisma.match.update({
            where: { id: match.id },
            data: { bracketPosition }
          })
        );
      }
    }
    
    // Process Championship (Round 6) match - 1 position (National)
    if (matchesByRound[6]) {
      console.log(`Processing ${matchesByRound[6].length} Championship match`);
      
      for (const match of matchesByRound[6]) {
        const bracketPosition = 'N61';
        
        console.log(`Match ${match.id}: ${match.region} - Setting position to ${bracketPosition}`);
        
        updates.push(
          prisma.match.update({
            where: { id: match.id },
            data: { bracketPosition }
          })
        );
      }
    }
    
    // Execute all updates
    await Promise.all(updates);
    
    console.log(`Successfully updated ${updates.length} matches`);
    
    // Verify updates
    const updatedMatches = await prisma.match.findMany({
      where: {
        NOT: {
          bracketPosition: null
        }
      },
      orderBy: [
        { round: 'asc' },
        { region: 'asc' }
      ]
    });
    
    console.log(`\nVerified ${updatedMatches.length} matches with bracket positions:`);
    updatedMatches.forEach((match: MatchWithTeams) => {
      console.log(`Match ${match.id}: Round ${match.round}, ${match.region} - Position: ${match.bracketPosition}`);
    });
    
  } catch (error) {
    console.error('Error updating bracket positions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update function
updateBracketPositions(); 