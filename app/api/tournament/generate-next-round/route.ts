import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../lib/prisma';

// Define type for Game object
interface Game {
  id: number;
  region: string;
  round: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
  completed: boolean;
  tournamentId: number;
}

// Define type for games grouped by region
interface GamesByRegion {
  [region: string]: Game[];
}

// Define type for region winners
interface RegionWinners {
  [region: string]: number;
}

// POST /api/tournament/generate-next-round - Generate next round games (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
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
    const rounds = [
      'Round of 64',
      'Round of 32',
      'Sweet 16',
      'Elite 8',
      'Final Four',
      'Championship'
    ];
    const currentIndex = rounds.indexOf(currentRound);
    if (currentIndex === -1 || currentIndex === rounds.length - 1) {
      return NextResponse.json(
        { error: 'Invalid current round or no next round available' },
        { status: 400 }
      );
    }
    const nextRound = rounds[currentIndex + 1];
    // Get current round games
    const currentRoundGames = await prisma.game.findMany({
      where: {
        tournamentId: parseInt(tournamentId),
        round: currentRound,
        completed: true
      },
      orderBy: [
        { region: 'asc' },
        { id: 'asc' }
      ]
    });
    if (currentRoundGames.length === 0) {
      return NextResponse.json(
        { error: 'No completed games found for the current round' },
        { status: 400 }
      );
    }
    // Generate next round games
    const nextRoundGames = [];
    if (nextRound === 'Round of 32') {
      // Group games by region
      const gamesByRegion: GamesByRegion = {};
      currentRoundGames.forEach(game => {
        if (!gamesByRegion[game.region]) {
          gamesByRegion[game.region] = [];
        }
        gamesByRegion[game.region].push(game);
      });
      // Create Round of 32 matchups (winners play each other in pairs)
      for (const region in gamesByRegion) {
        const regionGames = gamesByRegion[region];
        for (let i = 0; i < regionGames.length; i += 2) {
          const game1 = regionGames[i];
          const game2 = i + 1 < regionGames.length ? regionGames[i + 1] : null;
          if (game1 && game2 && game1.winnerId && game2.winnerId) {
           nextRoundGames.push({
              round: nextRound,
              region,
              team1Id: game1.winnerId,
              team2Id: game2.winnerId,
              tournamentId: parseInt(tournamentId)
            });
          }
        }
      }
    } else if (nextRound === 'Sweet 16' || nextRound === 'Elite 8') {
      // Similar logic as Round of 32, group by region
      const gamesByRegion: GamesByRegion = {};
      currentRoundGames.forEach(game => {
        if (!gamesByRegion[game.region]) {
          gamesByRegion[game.region] = [];
        }
        gamesByRegion[game.region].push(game);
      });
      for (const region in gamesByRegion) {
        const regionGames = gamesByRegion[region];
        for (let i = 0; i < regionGames.length; i += 2) {
          const game1 = regionGames[i];
          const game2 = i + 1 < regionGames.length ? regionGames[i + 1] : null;
          if (game1 && game2 && game1.winnerId && game2.winnerId) {
            nextRoundGames.push({
              round: nextRound,
              region,
              team1Id: game1.winnerId,
              team2Id: game2.winnerId,
              tournamentId: parseInt(tournamentId)
            });
          }
        }
      }
    } else if (nextRound === 'Final Four') {
      // Group by region for Elite 8 winners
      const regionWinners: RegionWinners = {};
      currentRoundGames.forEach(game => {
        if (game.winnerId) {
          regionWinners[game.region] = game.winnerId;
        }
      });
      // Create Final Four matchups (typically East vs West, South vs Midwest)
      const regions = Object.keys(regionWinners);
      if (regions.length >= 4) {
        // Matchup 1: Region 0 vs Region 1
        nextRoundGames.push({
          round: nextRound,
          region: 'Final',
          team1Id: regionWinners[regions[0]],
          team2Id: regionWinners[regions[1]],
          tournamentId: parseInt(tournamentId)
        });
        // Matchup 2: Region 2 vs Region 3
        nextRoundGames.push({
          round: nextRound,
          region: 'Final',
          team1Id: regionWinners[regions[2]],
          team2Id: regionWinners[regions[3]],
          tournamentId: parseInt(tournamentId)
        });
      }
    } else if (nextRound === 'Championship') {
      // Create championship game from Final Four winners
      if (currentRoundGames.length === 2 &&
          currentRoundGames[0].winnerId &&
          currentRoundGames[1].winnerId) {
        nextRoundGames.push({
          round: nextRound,
          region: 'Final',
          team1Id: currentRoundGames[0].winnerId,
          team2Id: currentRoundGames[1].winnerId,
          tournamentId: parseInt(tournamentId)
        });
      }
    }
    if (nextRoundGames.length === 0) {
      return NextResponse.json(
        { error: 'Could not generate any games for the next round' },
        { status: 400 }
      );
    }
    // Create games in the database
    const createdGames = await prisma.game.createMany({
      data: nextRoundGames
    });
    return NextResponse.json({
      message: `Created ${createdGames.count} games for the ${nextRound}`
    });
  } catch (error) {
    console.error('Error generating next round:', error);
    return NextResponse.json(
      { error: 'Failed to generate next round games' },
      { status: 500 }
    );
  }
}
