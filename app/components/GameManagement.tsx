'use client';
import { useState, useEffect } from 'react';
import './game-management.css';

// Define interfaces for TypeScript
interface Team {
  id: number;
  name: string;
  seed: number;
  region: string;
  eliminated?: boolean;
}

interface Match {
  id: number;
  round: number;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
  team1Score: number | null;
  team2Score: number | null;
  completed: boolean;
  team1?: Team;
  team2?: Team;
  bracketPosition?: string;
}

interface GameManagementProps {
  tournamentId: number;
}

// Separate component for individual match row
const MatchRow = ({ 
  match, 
  teams, 
  onUpdateMatchState,
  isEditable
}: { 
  match: Match, 
  teams: Team[], 
  onUpdateMatchState: (matchId: number, updates: Partial<Match>) => void,
  isEditable: boolean
}) => {
  const [team1Score, setTeam1Score] = useState<string | number>(match.team1Score || '');
  const [team2Score, setTeam2Score] = useState<string | number>(match.team2Score || '');
  
  const team1 = teams.find((team) => team.id === match.team1Id) || { id: 0, name: 'TBD', seed: 0 };
  const team2 = teams.find((team) => team.id === match.team2Id) || { id: 0, name: 'TBD', seed: 0 };

  useEffect(() => {
    setTeam1Score(match.team1Score || '');
    setTeam2Score(match.team2Score || '');
  }, [match.team1Score, match.team2Score]);

  const handleTeamClick = async (teamId: number) => {
    if (!isEditable) return;
    onUpdateMatchState(match.id, {
      winnerId: teamId,
      completed: true
    });
  };

  const handleScoreChange = async (teamNumber: 1 | 2, score: number) => {
    if (!isEditable) return;
    onUpdateMatchState(match.id, {
      [`team${teamNumber}Score`]: score
    });
  };

  return (
    <tr key={match.id}>
      <td>{match.region}</td>
      <td>
        <button 
          className={`game-management-team-button ${match.winnerId === team1.id ? 'winner' : ''}`}
          onClick={() => handleTeamClick(team1.id)}
          disabled={!isEditable || team1.id === 0}
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
          disabled={!isEditable || team2.id === 0}
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
            onChange={(e) => handleScoreChange(1, Number(e.target.value))}
            min="0"
            placeholder="Score"
            disabled={!isEditable}
          />
          <span>-</span>
          <input
            type="number"
            className="game-management-score-input"
            value={team2Score.toString()}
            onChange={(e) => handleScoreChange(2, Number(e.target.value))}
            min="0"
            placeholder="Score"
            disabled={!isEditable}
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

export default function GameManagement({ tournamentId }: GameManagementProps) {
  const [currentRound, setCurrentRound] = useState(1);
  const [tournamentRound, setTournamentRound] = useState(1);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [matchesByRegion, setMatchesByRegion] = useState<Record<string, Match[]>>({});

  const rounds = [
    { number: 1, name: 'Round of 64' },
    { number: 2, name: 'Round of 32' },
    { number: 3, name: 'Sweet 16' },
    { number: 4, name: 'Elite 8' },
    { number: 5, name: 'Final Four' },
    { number: 6, name: 'Championship' }
  ];

  const loadMatches = async () => {
    try {
      setLoading(true);
      console.log(`Loading matches for round ${currentRound}`);
      
      const response = await fetch(`/api/matches?round=${currentRound}&tournamentId=${tournamentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }

      const matches = await response.json();
      console.log(`Loaded ${matches.length} matches for round ${currentRound}:`, matches);

      // Filter matches to ensure we only get matches for the current round
      const currentRoundMatches = matches.filter((match: Match) => match.round === currentRound);

      // Set the flat matches array
      setMatches(currentRoundMatches);

      // Group matches by region
      const matchesByRegion = currentRoundMatches.reduce((acc: Record<string, Match[]>, match: Match) => {
        if (!acc[match.region]) {
          acc[match.region] = [];
        }
        acc[match.region].push(match);
        return acc;
      }, {});

      setMatchesByRegion(matchesByRegion);

      // Check if all matches in the current round have winners
      const allMatchesCompleted = currentRoundMatches.every((match: Match) => match.winnerId);
      console.log(`All matches completed for round ${currentRound}:`, allMatchesCompleted);

      if (allMatchesCompleted && currentRound === tournamentRound) {
        console.log(`All matches completed for current tournament round ${tournamentRound}, generating next round`);
        await generateNextRound();
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const generateNextRound = async () => {
    try {
      console.log(`Generating next round from round ${currentRound}`);
      
      const response = await fetch('/api/tournament/generate-next-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId,
          currentRound: rounds.find(r => r.number === currentRound)?.name
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate next round');
      }

      const result = await response.json();
      console.log(`Generated next round:`, result);

      // Update tournament round
      const nextRoundNumber = rounds.find(r => r.name === result.currentRound)?.number;
      if (nextRoundNumber) {
        setTournamentRound(nextRoundNumber);
      }
      
      // Load matches for the new round
      await loadMatches();
    } catch (error) {
      console.error('Error generating next round:', error);
      setError('Failed to generate next round');
    }
  };

  // Initial data fetch effect
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Fetch tournament data to get current round
        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
        if (!tournamentResponse.ok) {
          throw new Error('Failed to fetch tournament data');
        }
        const tournamentData = await tournamentResponse.json();
        console.log('Tournament data:', tournamentData);

        // Convert round name to number and set the ACTUAL tournament round
        const actualTournamentRound = rounds.find(r => r.name === tournamentData.currentRound)?.number;
        console.log('Setting tournament round to:', actualTournamentRound);
        if (actualTournamentRound) {
          setTournamentRound(actualTournamentRound);
          // Set the initially viewed round to the actual tournament round
          setCurrentRound(actualTournamentRound);
        } else {
           // Default to round 1 if tournament round is not found (e.g., Pre-Tournament)
          setTournamentRound(1);
          setCurrentRound(1);
        }

        // Fetch teams
        const teamsResponse = await fetch('/api/teams');
        if (!teamsResponse.ok) {
          throw new Error('Failed to fetch teams');
        }
        const teamsData = await teamsResponse.json();
        setTeams(teamsData);

        // Load initial matches
        await loadMatches();
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [tournamentId]); // Only depend on tournamentId

  // Effect to handle round changes
  useEffect(() => {
    if (tournamentId && currentRound > 0) {
      console.log(`Current round changed to ${currentRound}, loading matches...`);
      loadMatches();
    }
  }, [currentRound, tournamentId]);

  // Logging for round editability (keep this)
  useEffect(() => {
    console.log('Current round:', currentRound);
    console.log('Tournament round:', tournamentRound);
    console.log('Is round editable:', isRoundEditable(currentRound));
  }, [currentRound, tournamentRound]); // Remove matches from dependencies

  // Update match state and save immediately
  const handleUpdateMatchState = async (matchId: number, updates: Partial<Match>) => {
    const scrollY = window.scrollY;
    
    try {
      setLoading(true);
      setError('');

      // Update match in the database
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

      // Update local state instead of reloading all matches
      setMatches(prevMatches => 
        prevMatches.map(match => 
          match.id === matchId 
            ? { ...match, ...updates }
            : match
        )
      );

      // Update matchesByRegion state
      setMatchesByRegion(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(region => {
          newState[region] = newState[region].map(match =>
            match.id === matchId ? { ...match, ...updates } : match
          );
        });
        return newState;
      });

      // Check for round completion and advance
      const tournamentRoundName = rounds.find(r => r.number === tournamentRound)?.name;
      if (tournamentRoundName) {
        const checkMatchesResponse = await fetch(`/api/matches?round=${tournamentRoundName}&tournamentId=${tournamentId}`);
        if (checkMatchesResponse.ok) {
          const tournamentRoundMatches = await checkMatchesResponse.json();
          const allTournamentRoundMatchesComplete = tournamentRoundMatches.every((m: Match) => m.winnerId !== null);

          if (allTournamentRoundMatchesComplete && currentRound === tournamentRound) {
            setSuccessMessage('All matches complete! Generating next round...');
            setLoading(true);
            
            try {
              const generateResponse = await fetch('/api/tournament/generate-next-round', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  tournamentId,
                  currentRound: tournamentRoundName
                }),
              });

              if (!generateResponse.ok) {
                const errorBody = await generateResponse.text();
                throw new Error(`Failed to generate next round: ${generateResponse.statusText} - ${errorBody}`); 
              }

              const result = await generateResponse.json();
              setSuccessMessage('Next round generated! Advancing tournament...');

              const nextRound = rounds.find(r => r.name === result.currentRound);
              if (nextRound) {
                const advanceResponse = await fetch('/api/tournament/advance-round', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    tournamentId,
                    nextRound: nextRound.name
                  }),
                });

                if (!advanceResponse.ok) {
                  const errorBody = await advanceResponse.text();
                  throw new Error(`Failed to advance round: ${advanceResponse.statusText} - ${errorBody}`);
                }

                setTournamentRound(nextRound.number);
                setCurrentRound(nextRound.number);
                setSuccessMessage(`Advanced to ${nextRound.name}!`);
                
                // Only load matches after advancing to a new round
                await loadMatches();
              } else {
                throw new Error('Generated next round name is invalid.');
              }
            } catch (advanceError) {
              console.error('Error during automatic round advancement:', advanceError);
              setError(advanceError instanceof Error ? `Auto-advance failed: ${advanceError.message}` : 'Auto-advance failed: Unknown error');
              setSuccessMessage('');
            } finally {
              setLoading(false);
            }
          }
        }
      }

      if (!successMessage) {
        setSuccessMessage('Match updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      
      window.scrollTo(0, scrollY);
      
    } catch (error) {
      console.error('Error updating match state:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setSuccessMessage('');
      window.scrollTo(0, scrollY);
    } finally {
      setLoading(false);
    }
  };

  // Count how many matches have winners
  const matchesWithWinners = matches.filter(match => match.winnerId !== null).length;
  const totalMatches = matches.length;

  // Determine if a round is editable
  const isRoundEditable = (roundNumber: number) => {
    // console.log('Checking if round is editable:', { roundNumber, tournamentRound, isEditable: roundNumber === tournamentRound }); // Keep if needed
    return roundNumber === tournamentRound;
  };

  // Ensure handleTabClick updates the currentRound state - RENAME to handleRoundChange
  const handleRoundChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRoundNumber = parseInt(event.target.value, 10);
    console.log(`Dropdown changed, setting current round to: ${selectedRoundNumber}`);
    setCurrentRound(selectedRoundNumber);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="game-management-error">Error: {error}</div>;
  }

  const currentRoundName = rounds.find(r => r.number === currentRound)?.name || 'Unknown Round';

  return (
    <div className="game-management-container">
      <h2 className="game-management-title">Game Management</h2>

      {successMessage && (
        <div className="game-management-success">{successMessage}</div>
      )}

      <div className="game-management-controls">
        {/* Replace Tabs with Dropdown */}
        <div className="game-management-round-selector">
          <label htmlFor="roundSelector" className="game-management-round-label">Select Round to View:</label>
          <select
            id="roundSelector"
            className="game-management-round-dropdown"
            value={currentRound}
            onChange={handleRoundChange}
          >
            {rounds.map(round => (
              <option key={round.number} value={round.number} disabled={round.number > tournamentRound}>
                 {round.name} {round.number > tournamentRound ? '(Future)' : ''} {round.number === tournamentRound ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="game-management-progress">
          {/* Display progress for the VIEWED round */}
          <span>
            {matchesWithWinners} of {totalMatches} matches have winners ({currentRoundName})
          </span>
        </div>
      </div>

      {/* Matches Container - Renders matches based on currentRound state */}
      <div className="game-management-matches-container">
        <div className="game-management-matches-header">
          <h3 className="game-management-round-title">{currentRoundName} Matches</h3>
        </div>
        {Object.keys(matchesByRegion).length > 0 ? (
           Object.entries(matchesByRegion).map(([region, regionMatches]) => (
            <div key={region} className="game-management-region-section">
              <h4 className="game-management-region-title">{region}</h4>
              <div className="game-management-matches-table-container">
                <table className="game-management-matches-table">
                  <thead>
                    <tr>
                      {/* Adjust columns if needed */}
                      <th>Team 1</th>
                      <th>Team 2</th>
                      <th>Score</th>
                      <th>Winner</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionMatches.map((match) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        teams={teams}
                        isEditable={isRoundEditable(currentRound)} // Editability based on VIEWED round vs ACTUAL tournament round
                        onUpdateMatchState={handleUpdateMatchState}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="game-management-no-matches">No matches found for this round.</div>
        )}
      </div>
    </div>
  );
}