'use client';
import { useState, useEffect } from 'react';
import './game-management.css';

// Define interfaces for TypeScript
interface Team {
  id: number;
  name: string;
  seed: string | number;
  region?: string;
}

interface Match {
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

// Separate component for individual match row
const MatchRow = ({ 
  match, 
  teams, 
  onUpdateMatchState
}: { 
  match: Match, 
  teams: Team[], 
  onUpdateMatchState: (matchId: number, updates: Partial<Match>) => void
}) => {
  const [team1Score, setTeam1Score] = useState<string | number>(match.team1Score || '');
  const [team2Score, setTeam2Score] = useState<string | number>(match.team2Score || '');
  
  const team1 = teams.find((team) => team.id === match.team1Id) || { id: 0, name: 'TBD', seed: '-' };
  const team2 = teams.find((team) => team.id === match.team2Id) || { id: 0, name: 'TBD', seed: '-' };

  useEffect(() => {
    setTeam1Score(match.team1Score || '');
    setTeam2Score(match.team2Score || '');
  }, [match.team1Score, match.team2Score]);

  const handleTeamClick = (teamId: number) => {
    const updates: Partial<Match> = {
      winnerId: teamId,
      completed: true  // Set match as completed when winner is selected
    };
    
    // If scores exist, include them in the update
    if (team1Score !== '') {
      updates.team1Score = Number(team1Score);
    }
    if (team2Score !== '') {
      updates.team2Score = Number(team2Score);
    }
    
    onUpdateMatchState(match.id, updates);
  };

  const handleTeam1ScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeam1Score(e.target.value);
    // Only update if there's already a winner selected
    if (match.winnerId) {
      onUpdateMatchState(match.id, { 
        team1Score: e.target.value ? Number(e.target.value) : null,
        team2Score: team2Score ? Number(team2Score) : null,
        winnerId: match.winnerId
      });
    }
  };

  const handleTeam2ScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeam2Score(e.target.value);
    // Only update if there's already a winner selected
    if (match.winnerId) {
      onUpdateMatchState(match.id, { 
        team1Score: team1Score ? Number(team1Score) : null,
        team2Score: e.target.value ? Number(e.target.value) : null,
        winnerId: match.winnerId
      });
    }
  };

  return (
    <tr key={match.id}>
      <td>{match.region}</td>
      <td>
        <button 
          className={`game-management-team-button ${match.winnerId === team1.id ? 'winner' : ''}`}
          onClick={() => handleTeamClick(team1.id)}
          disabled={team1.id === 0}
        >
          <div className="game-management-team-info">
            <span className="game-management-team-seed">{team1.seed}</span>
            <span>{team1.name}</span>
          </div>
        </button>
      </td>
      <td>
        <button 
          className={`game-management-team-button ${match.winnerId === team2.id ? 'winner' : ''}`}
          onClick={() => handleTeamClick(team2.id)}
          disabled={team2.id === 0}
        >
          <div className="game-management-team-info">
            <span className="game-management-team-seed">{team2.seed}</span>
            <span>{team2.name}</span>
          </div>
        </button>
      </td>
      <td>
        <div className="game-management-score-inputs">
          <input
            type="number"
            className="game-management-score-input"
            value={team1Score.toString()}
            onChange={handleTeam1ScoreChange}
            min="0"
            placeholder="Score"
          />
          <span>-</span>
          <input
            type="number"
            className="game-management-score-input"
            value={team2Score.toString()}
            onChange={handleTeam2ScoreChange}
            min="0"
            placeholder="Score"
          />
        </div>
      </td>
      <td>
        {match.completed && (
          <span className="game-management-match-complete">
            Complete
          </span>
        )}
      </td>
    </tr>
  );
};

const GameManagement: React.FC<GameManagementProps> = ({ tournamentId }) => {
  const [currentRound, setCurrentRound] = useState('Round of 64');
  const [matches, setMatches] = useState<Match[]>([]);
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

  // Load matches and teams
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

        // Fetch matches for the current round
        const matchesResponse = await fetch(`/api/matches?round=${currentRound}`);
        if (!matchesResponse.ok) {
          throw new Error('Failed to fetch matches');
        }
        const matchesData = await matchesResponse.json();
        setMatches(matchesData);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentRound]);

  // Update match state and save immediately
  const handleUpdateMatchState = async (matchId: number, updates: Partial<Match>) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update match');
      }

      // After updating the match, check if all matches in current round have winners
      const matchesResponse = await fetch(`/api/matches?round=${currentRound}`);
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setMatches(matchesData);

        // Check if all matches in current round have winners
        const allMatchesComplete = matchesData.every((m: Match) => m.completed);
        if (allMatchesComplete) {
          // First generate next round matches
          const generateResponse = await fetch('/api/tournament/generate-next-round', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tournamentId,
              currentRound
            }),
          });

          if (generateResponse.ok) {
            // Then advance the tournament to the next round
            const nextRound = rounds[rounds.indexOf(currentRound) + 1];
            if (nextRound) {
              const advanceResponse = await fetch('/api/tournament/advance-round', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  tournamentId,
                  nextRound
                }),
              });

              if (advanceResponse.ok) {
                setCurrentRound(nextRound);
                setSuccessMessage(`Advanced to ${nextRound}!`);
              }
            }
          }
        }
      }

      setSuccessMessage('Match updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Navigate between rounds
  const navigateRound = (direction: 'prev' | 'next') => {
    const currentIndex = rounds.indexOf(currentRound);
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentRound(rounds[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < rounds.length - 1) {
      setCurrentRound(rounds[currentIndex + 1]);
    }
  };

  // Count how many matches have winners
  const matchesWithWinners = matches.filter(match => match.winnerId !== null).length;
  const totalMatches = matches.length;

  return (
    <div className="game-management-container">
      <h2 className="game-management-title">Game Management</h2>
      
      {error && (
        <div className="game-management-error">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="game-management-success">
          {successMessage}
        </div>
      )}
      
      <div className="game-management-controls">
        <div className="game-management-round-navigation">
          <button 
            className="game-management-btn" 
            onClick={() => navigateRound('prev')}
            disabled={rounds.indexOf(currentRound) === 0}
          >
            Previous Round
          </button>
          <span className="game-management-current-round">{currentRound}</span>
          <button 
            className="game-management-btn" 
            onClick={() => navigateRound('next')}
            disabled={rounds.indexOf(currentRound) === rounds.length - 1}
          >
            Next Round
          </button>
        </div>
        
        <div className="game-management-progress">
          <span>{matchesWithWinners} of {totalMatches} matches have winners</span>
        </div>
      </div>

      <div className="game-management-matches-container">
        <div className="game-management-matches-header">
          <h3 className="game-management-round-title">{currentRound} Matches</h3>
        </div>

        {matches.length === 0 ? (
          <div className="game-management-no-matches">
            No matches found for this round.
          </div>
        ) : (
          <div className="game-management-matches-table-container">
            <table className="game-management-matches-table">
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Team 1</th>
                  <th>Team 2</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <MatchRow 
                    key={match.id} 
                    match={match} 
                    teams={teams} 
                    onUpdateMatchState={handleUpdateMatchState}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameManagement;