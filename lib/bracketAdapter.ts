// bracketAdapter.ts
import { Game as LibGame } from './types';

// Update your interface to match what Bracket now expects
export interface BracketMatch {
  id: number;
  round: number;      // Changed from string to number
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
  team1Score?: number | null;
  team2Score?: number | null;
  completed: boolean;
}

// Map round names to numbers
const roundToNumberMap: Record<string, number> = {
  'Round of 64': 1,
  'Round of 32': 2,
  'Sweet 16': 3,
  'Elite 8': 4,
  'Final Four': 5,
  'Championship': 6
};

// Update the function to return BracketMatch[] instead of BracketGame[]
export function adaptGamesToBracket(games: LibGame[]): BracketMatch[] {
  return games.map(game => ({
    id: game.id ?? -(Math.floor(Math.random() * 10000) + 1),
    // Convert string round to number
    round: typeof game.round === 'string' ? roundToNumberMap[game.round] || 0 : 0,
    region: game.region,
    team1Id: game.team1Id ?? 0,
    team2Id: game.team2Id ?? 0,
    winnerId: game.winnerId,
    team1Score: game.team1Score,
    team2Score: game.team2Score,
    completed: game.completed ?? false
  }));
}