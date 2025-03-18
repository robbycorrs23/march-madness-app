// types.ts - centralized type definitions
export interface Tournament {
  id?: number;
  name: string;
  year: number;
  entryFee: number;
  currentRound: string;
  regions: string[];
}

export interface Team {
  id: number;
  name: string;
  seed: number;
  region: string;
  eliminated?: boolean;
}

export interface Game {
  id: number;
  round: string;
  region: string;
  team1Id: number | null;
  team2Id: number | null;
  winnerId: number | null;
  team1Score?: number | null;
  team2Score?: number | null;
  completed?: boolean;
}

export interface Pick {
  id?: number;
  participantId: number;
  gameId?: number;
  teamId: number;
  pickType: string; // e.g., 'Round of 64', 'Final Four', 'Champion'
  points?: number;
  correct?: boolean;
}

export interface Participant {
  id?: number;
  name: string;
  email: string;
  tournamentId: number;
  totalPoints?: number;
  paid?: boolean;
}