const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

interface Team {
  id: number;
  name: string;
  seed: number;
}

interface Match {
  id: number;
  round: number;
  region: string;
  team1Id: number;
  team2Id: number;
  team1?: Team;
  team2?: Team;
  winnerId: number | null;
  completed: boolean;
}

interface MatchesByRound {
  [key: number]: Match[];
}

async function checkMatches() {
  try {
    // Get all matches
    const matches = await prisma.match.findMany({
      include: {
        team1: true,
        team2: true
      },
      orderBy: [
        { round: 'asc' },
        { region: 'asc' }
      ]
    }) as Match[];

    console.log('\nAll Matches:');
    matches.forEach((match: Match) => {
      console.log(`Round ${match.round} - ${match.region}: ${match.team1?.name} (${match.team1?.seed}) vs ${match.team2?.name} (${match.team2?.seed})`);
    });

    // Group by round
    const matchesByRound = matches.reduce((acc: MatchesByRound, match: Match) => {
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    }, {});

    console.log('\nMatches by Round:');
    Object.entries(matchesByRound).forEach(([round, matches]: [string, Match[]]) => {
      console.log(`\nRound ${round} (${matches.length} matches):`);
      matches.forEach((match: Match) => {
        console.log(`  ${match.region}: ${match.team1?.name} (${match.team1?.seed}) vs ${match.team2?.name} (${match.team2?.seed})`);
      });
    });

  } catch (error) {
    console.error('Error checking matches:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkMatches(); 