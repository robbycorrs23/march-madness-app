// bracketAdapter.ts
import { Game as LibGame } from './types';

// Create a type that matches what your Bracket component expects
export interface BracketGame {
  id: number;          // Required, not optional
  round: string;
  region: string;
  team1Id: number;     // Required number, not null
  team2Id: number;     // Required number, not null
  winnerId: number | null;
  team1Score?: number | null;
  team2Score?: number | null;
  completed?: boolean;
}

// This function converts from your lib/types.ts Game to the Bracket component's Game type
export function adaptGamesToBracket(games: LibGame[]): BracketGame[] {
  return games.map(game => ({
    // Ensure id is always a number (if undefined, use a negative number)
    id: game.id ?? -(Math.floor(Math.random() * 10000) + 1),
    round: game.round,
    region: game.region,
    // Ensure team IDs are always numbers (if null, use 0)
    team1Id: game.team1Id ?? 0,
    team2Id: game.team2Id ?? 0,
    winnerId: game.winnerId,
    team1Score: game.team1Score,
    team2Score: game.team2Score,
    completed: game.completed ?? false
  }));
}
