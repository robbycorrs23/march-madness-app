// @ts-check
import { PrismaClient } from '@prisma/client';
import path from 'path';

// Initialize Prisma Client with the correct schema path
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Define types from schema
interface Tournament {
  id: number;
  name: string;
}

interface Match {
  id: number;
  round: number;
  region: string;
  bracketPosition: string | null;
}

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
      const matchGroups: Record<string, Match[]> = {};
      
      matches.forEach((match: Match) => {
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