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
  // Local state for each match row
  const [winnerId, setWinnerId] = useState<string | number>(match.winnerId || '');
  const [team1Score, setTeam1Score] = useState<string | number>(match.team1Score || '');
  const [team2Score, setTeam2Score] = useState<string | number>(match.team2Score || '');
  const [hasChanged, setHasChanged] = useState(false);
  
  // Find teams
  const team1 = teams.find((team) => team.id === match.team1Id) || { id: 0, name: 'TBD', seed: '-' };
  const team2 = teams.find((team) => team.id === match.team2Id) || { id: 0, name: 'TBD', seed: '-' };

  // Update local state when match props change
  useEffect(() => {
    setWinnerId(match.winnerId || '');
    setTeam1Score(match.team1Score || '');
    setTeam2Score(match.team2Score || '');
    setHasChanged(false);
  }, [match.winnerId, match.team1Score, match.team2Score]);
  
  // When values change, update parent component
  useEffect(() => {
    if (hasChanged) {
      // Create updates object with only the fields that have values
      const updates: Partial<Match> = {};
      
      if (winnerId) {
        updates.winnerId = Number(winnerId);
      }
      
      if (team1Score !== '') {
        updates.team1Score = Number(team1Score);
      }
      
      if (team2Score !== '') {
        updates.team2Score = Number(team2Score);
      }
      
      // Only send update if we have at least one field
      if (Object.keys(updates).length > 0) {
        onUpdateMatchState(match.id, updates);
      }
    }
  }, [winnerId, team1Score, team2Score, hasChanged, match.id, onUpdateMatchState]);
  
  const handleWinnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setWinnerId(e.target.value);
    setHasChanged(true);
  };

  const handleTeam1ScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeam1Score(e.target.value);
    setHasChanged(true);
  };

  const handleTeam2ScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeam2Score(e.target.value);
    setHasChanged(true);
  };

  return (
    <tr key={match.id}>
      <td>{match.region}</td>
      <td>
        <div className="game-management-team-info">
          <span className="game-management-team-seed">{team1.seed}</span>
          <span>{team1.name}</span>
        </div>
      </td>
      <td>
        <div className="game-management-team-info">
          <span className="game-management-team-seed">{team2.seed}</span>
          <span>{team2.name}</span>
        </div>
      </td>
      <td>
        <select
          className="game-management-winner-select"
          value={winnerId.toString()}
          onChange={handleWinnerChange}
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
      <td>
        <div className="game-management-score-inputs">
          <input
            type="number"
            className="game-management-score-input"
            value={team1Score.toString()}
            onChange={handleTeam1ScoreChange}
            min="0"
          />
          <span>-</span>
          <input
            type="number"
            className="game-management-score-input"
            value={team2Score.toString()}
            onChange={handleTeam2ScoreChange}
            min="0"
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
  const [pendingUpdates, setPendingUpdates] = useState<{[key: number]: Partial<Match>}>({});

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

  // Update match state in parent component
  const handleUpdateMatchState = (matchId: number, updates: Partial<Match>) => {
    setPendingUpdates(prev => ({
      ...prev,
      [matchId]: updates
    }));
  };

  // Save all pending match updates
  const saveAllResults = async () => {
    try {
      setLoading(true);
      // Prepare updates
      const updatePromises = Object.entries(pendingUpdates).map(([matchId, updates]) => {
        // Allow updates with partial data - don't require all fields to be filled
        return fetch(`/api/matches/${matchId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });
      });

      // Execute all updates
      const responses = await Promise.all(updatePromises);

      // Check if any updates were successful
      const someSuccessful = responses.some(response => response?.ok);

      if (someSuccessful) {
        // Refresh matches
        const matchesResponse = await fetch(`/api/matches?round=${currentRound}`);
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json();
          setMatches(matchesData);
        }
        
        // Clear pending updates
        setPendingUpdates({});

        setSuccessMessage('Match results saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error('Failed to save match results');
      }
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

  // Check if we have any pending updates
  const hasPendingUpdates = Object.keys(pendingUpdates).length > 0;

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
          <>
            <div className="game-management-matches-table-container">
              <table className="game-management-matches-table">
                <thead>
                  <tr>
                    <th>Region</th>
                    <th>Team 1</th>
                    <th>Team 2</th>
                    <th>Winner</th>
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
            <div className="game-management-save-all-container">
              <button
                onClick={saveAllResults}
                className="game-management-btn game-management-btn-save-all"
                disabled={loading || !hasPendingUpdates}
              >
                Save Results
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameManagement;