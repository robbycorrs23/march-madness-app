'use client';
import { useState, useEffect } from 'react';

// Define interfaces for TypeScript
interface Team {
  id: number;
  name: string;
  seed: string | number;
  region?: string;
}

interface Game {
  id: number;
  round: string;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
  team1Score: number | null;
  team2Score: number | null;
  completed: boolean;
}

interface GameManagementProps {
  tournamentId: number | string;
}

const GameManagement: React.FC<GameManagementProps> = ({ tournamentId }) => {
  const [currentRound, setCurrentRound] = useState('Round of 64');
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const rounds = [
    'Round of 64',
    'Round of 32',
    'Sweet 16',
    'Elite 8',
    'Final Four',
    'Championship'
  ];

  // Load games and teams
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch teams
        const teamsResponse = await fetch('/api/teams');
        if (!teamsResponse.ok) {
          throw new Error('Failed to fetch teams');
        }
        const teamsData = await teamsResponse.json();
        setTeams(teamsData);

        // Fetch games for the current round
        const gamesResponse = await fetch(`/api/games?round=${currentRound}`);
        if (!gamesResponse.ok) {
          throw new Error('Failed to fetch games');
        }
        const gamesData = await gamesResponse.json();
        setGames(gamesData);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentRound]);

  // Update game result
  const updateGame = async (
    gameId: number, 
    winnerId: number | string, 
    team1Score: number | string, 
    team2Score: number | string
  ) => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winnerId: Number(winnerId),
          team1Score: parseInt(team1Score as string),
          team2Score: parseInt(team2Score as string),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update game');
      }

      // Update the local state
      setGames(
        games.map((game) =>
          game.id === gameId
            ? {
                ...game,
                winnerId: Number(winnerId),
                team1Score: parseInt(team1Score as string),
                team2Score: parseInt(team2Score as string),
                completed: true,
              }
            : game
        )
      );

      setSuccessMessage('Game updated successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  // Calculate scores for all participants
  const calculateScores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scores/calculate', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to calculate scores');
      }

      setSuccessMessage('Scores calculated successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Advance to next round
  const advanceToNextRound = async () => {
    const currentIndex = rounds.indexOf(currentRound);
    if (currentIndex < rounds.length - 1) {
      const nextRound = rounds[currentIndex + 1];
      try {
        setLoading(true);
        const response = await fetch('/api/tournament/advance-round', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId,
            currentRound,
            nextRound,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to advance to next round');
        }

        setCurrentRound(nextRound);
        setSuccessMessage(`Advanced to ${nextRound} successfully!`);
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Generate games for next round based on winners
  const generateNextRoundGames = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tournament/generate-next-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId,
          currentRound,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate next round games');
      }

      setSuccessMessage('Next round games generated successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Find team by ID
  const getTeam = (teamId: number): Team => {
    return teams.find((team) => team.id === teamId) || { id: 0, name: 'TBD', seed: '-' };
  };

  if (loading && games.length === 0) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Game Management</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Round:</label>
          <select
            className="border rounded px-3 py-2"
            value={currentRound}
            onChange={(e) => setCurrentRound(e.target.value)}
          >
            {rounds.map((round) => (
              <option key={round} value={round}>
                {round}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={calculateScores}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            disabled={loading}
          >
            Calculate Scores
          </button>
          
          <button
            onClick={advanceToNextRound}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            disabled={loading || rounds.indexOf(currentRound) === rounds.length - 1}
          >
            Advance to Next Round
          </button>
          
          <button
            onClick={generateNextRoundGames}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            disabled={loading || currentRound === 'Championship'}
          >
            Generate Next Round Games
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium">{currentRound} Games</h3>
        </div>

        {games.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No games found for this round.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team 1
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team 2
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Winner
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {games.map((game) => {
                  const team1 = getTeam(game.team1Id);
                  const team2 = getTeam(game.team2Id);

                  // State for this game row
                  const [winnerId, setWinnerId] = useState<string | number>(game.winnerId || '');
                  const [team1Score, setTeam1Score] = useState<string | number>(game.team1Score || '');
                  const [team2Score, setTeam2Score] = useState<string | number>(game.team2Score || '');

                  return (
                    <tr key={game.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {game.region}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="bg-gray-200 w-6 h-6 flex items-center justify-center rounded-full mr-2 text-xs font-bold">
                            {team1.seed}
                          </span>
                          <span>{team1.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="bg-gray-200 w-6 h-6 flex items-center justify-center rounded-full mr-2 text-xs font-bold">
                            {team2.seed}
                          </span>
                          <span>{team2.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          className="border rounded px-2 py-1 w-full"
                          value={winnerId.toString()}
                          onChange={(e) => setWinnerId(e.target.value)}
                          disabled={game.completed}
                        >
                          <option value="">-- Select Winner --</option>
                          <option value={team1.id.toString()}>
                            ({team1.seed}) {team1.name}
                          </option>
                          <option value={team2.id.toString()}>
                            ({team2.seed}) {team2.name}
                          </option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-16"
                            value={team1Score.toString()}
                            onChange={(e) => setTeam1Score(e.target.value)}
                            min="0"
                            disabled={game.completed}
                          />
                          <span>-</span>
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-16"
                            value={team2Score.toString()}
                            onChange={(e) => setTeam2Score(e.target.value)}
                            min="0"
                            disabled={game.completed}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!game.completed ? (
                          <button
                            onClick={() => updateGame(game.id, winnerId, team1Score, team2Score)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded"
                            disabled={!winnerId || team1Score === '' || team2Score === ''}
                          >
                            Save Result
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Complete
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameManagement;
