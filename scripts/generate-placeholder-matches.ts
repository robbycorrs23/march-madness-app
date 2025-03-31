const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();

  interface PlaceholderMatch {
    round: number;
    region: string;
    team1Id: number;
    team2Id: number;
    winnerId: number | null;
    bracketPosition: string;
    completed: boolean;
  }

  interface Match extends PlaceholderMatch {
    id: number;
  }

  // Map region names to region codes
  const regionToCode = {
    'East': 'E',
    'West': 'W',
    'South': 'S',
    'Midwest': 'M',
    'National': 'N'
  };

  try {
    // First, get all regions
    const regions = ['East', 'West', 'South', 'Midwest'];
    
    // Get a list of teams to use as placeholders
    const teams = await prisma.team.findMany({
      select: { id: true },
      take: 2 // We just need 2 teams for placeholders
    });

    if (teams.length < 2) {
      throw new Error('Need at least 2 teams in the database to create placeholder matches');
    }

    const placeholderTeam1Id = teams[0].id;
    const placeholderTeam2Id = teams[1].id;
    
    // Structure of matches per round
    const matchesPerRound = {
      3: 2,  // Sweet 16: 2 matches per region
      4: 1,  // Elite 8: 1 match per region
      5: 2,  // Final Four: 2 matches total (National)
      6: 1   // Championship: 1 match (National)
    };

    const placeholderMatches = [];

    // Generate Sweet 16 and Elite 8 matches for each region
    regions.forEach(region => {
      const regionCode = regionToCode[region];
      
      // Sweet 16 (Round 3)
      for (let i = 0; i < matchesPerRound[3]; i++) {
        placeholderMatches.push({
          round: 3,
          region,
          team1Id: placeholderTeam1Id,
          team2Id: placeholderTeam2Id,
          winnerId: null,
          bracketPosition: `${regionCode}3${i + 1}`,
          completed: false
        });
      }

      // Elite 8 (Round 4)
      for (let i = 0; i < matchesPerRound[4]; i++) {
        placeholderMatches.push({
          round: 4,
          region,
          team1Id: placeholderTeam1Id,
          team2Id: placeholderTeam2Id,
          winnerId: null,
          bracketPosition: `${regionCode}41`,
          completed: false
        });
      }
    });

    // Generate Final Four matches (National region)
    for (let i = 0; i < matchesPerRound[5]; i++) {
      placeholderMatches.push({
        round: 5,
        region: 'National',
        team1Id: placeholderTeam1Id,
        team2Id: placeholderTeam2Id,
        winnerId: null,
        bracketPosition: `N5${i + 1}`,
        completed: false
      });
    }

    // Generate Championship match (National region)
    placeholderMatches.push({
      round: 6,
      region: 'National',
      team1Id: placeholderTeam1Id,
      team2Id: placeholderTeam2Id,
      winnerId: null,
      bracketPosition: 'N61',
      completed: false
    });

    // Delete existing placeholder matches for these rounds
    await prisma.match.deleteMany({
      where: {
        round: { in: [3, 4, 5, 6] }
      }
    });

    // Create the placeholder matches
    const result = await prisma.match.createMany({
      data: placeholderMatches
    });

    console.log(`Successfully created ${result.count} placeholder matches`);
    
    // Log the created matches for verification
    const matches = await prisma.match.findMany({
      where: { round: { in: [3, 4, 5, 6] } },
      orderBy: [
        { round: 'asc' },
        { region: 'asc' }
      ]
    }) as Match[];

    console.log('\nCreated matches:');
    matches.forEach((match: Match) => {
      console.log(`Round ${match.round} - ${match.region} - Position: ${match.bracketPosition}`);
    });

  } catch (error) {
    console.error('Error generating placeholder matches:', error);
  } finally {
    await prisma.$disconnect();
  }
})(); 