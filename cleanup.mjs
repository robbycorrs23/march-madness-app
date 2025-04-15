import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
const prisma = new PrismaClient();

async function cleanupMatches() {
  try {
    // Get all tournaments
    const tournaments = await prisma.tournament.findMany();
    
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
      const matchGroups = {};
      
      matches.forEach(match => {
        const key = `${match.round}-${match.region}-${match.bracketPosition}`;
        if (!matchGroups[key]) {
          matchGroups[key] = [];
        }
        matchGroups[key].push(match);
      });
      
      // Delete duplicate matches
      for (const [key, group] of Object.entries(matchGroups)) {
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
          console.log(`Deleted ${result.count} duplicate matches for ${key}`);
        }
      }
    }
    
    console.log('Cleanup complete');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupMatches(); 