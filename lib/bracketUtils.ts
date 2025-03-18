// bracketUtils.ts
import { Team, Game } from './types';

// Generate games based on team seedings if no games exist
export function generateBracketGames(teams: Team[]): Game[] {
  // If no teams, return empty array
  if (!teams.length) return [];

  const games: Game[] = [];
  let gameId = -1; // Use negative IDs to distinguish from real DB IDs

  // Get unique regions from teams
  const regions = [...new Set(teams.map(team => team.region))];
  
  // Define standard matchups for first round (1 vs 16, 8 vs 9, etc.)
  const firstRoundMatchups = [
    [1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15]
  ];

  // Create first round games (Round of 64)
  regions.forEach(region => {
    const regionTeams = teams.filter(team => team.region === region);
    
    firstRoundMatchups.forEach(([seed1, seed2]) => {
      const team1 = regionTeams.find(team => team.seed === seed1);
      const team2 = regionTeams.find(team => team.seed === seed2);
      
      games.push({
        id: gameId--,
        round: 'Round of 64',
        region,
        team1Id: team1?.id || null,
        team2Id: team2?.id || null,
        winnerId: null,
        completed: false
      });
    });
  });

  // Create placeholder games for later rounds
  // Round of 32
  regions.forEach(region => {
    for (let i = 0; i < 4; i++) {
      games.push({
        id: gameId--,
        round: 'Round of 32',
        region,
        team1Id: null,
        team2Id: null,
        winnerId: null,
        completed: false
      });
    }
  });

  // Sweet 16
  regions.forEach(region => {
    for (let i = 0; i < 2; i++) {
      games.push({
        id: gameId--,
        round: 'Sweet 16',
        region,
        team1Id: null,
        team2Id: null,
        winnerId: null,
        completed: false
      });
    }
  });

  // Elite 8
  regions.forEach(region => {
    games.push({
      id: gameId--,
      round: 'Elite 8',
      region,
      team1Id: null,
      team2Id: null,
      winnerId: null,
      completed: false
    });
  });

  // Final Four
  games.push({
    id: gameId--,
    round: 'Final Four',
    region: 'National',
    team1Id: null,
    team2Id: null,
    winnerId: null,
    completed: false
  });
  
  games.push({
    id: gameId--,
    round: 'Final Four',
    region: 'National',
    team1Id: null,
    team2Id: null,
    winnerId: null,
    completed: false
  });

  // Championship
  games.push({
    id: gameId--,
    round: 'Championship',
    region: 'National',
    team1Id: null,
    team2Id: null,
    winnerId: null,
    completed: false
  });

  return games;
}