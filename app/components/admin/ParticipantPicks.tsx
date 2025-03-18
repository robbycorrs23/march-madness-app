'use client';
import React, { useState, useEffect } from 'react';

interface Team {
  id: number;
  name: string;
  seed: number;
  region: string;
  eliminated: boolean;
}

interface Game {
  id: number;
  round: string;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId?: number;
  team1Score?: number;
  team2Score?: number;
  completed: boolean;
}

// New interface for Match model
interface Match {
  id: number;
  round: number;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId?: number;
}

interface Tournament {
  id: number;
  year: number;
  name: string;
  currentRound: string;
  regions: string[];
}

interface Participant {
  id: number;
  name: string;
  email: string;
  totalScore: number;
  paid: boolean;
}

interface FinalFourPick {
  id: number;
  teamId: number;
}

interface FinalsPick {
  id: number;
  teamId: number;
}

interface ChampionPick {
  id: number;
  teamId: number;
}

interface CinderellaPick {
  id: number;
  teamId: number;
}

interface GamePick {
  id: number;
  gameId: number;
  teamId: number;
  correct?: boolean;
  roundScore: number;
}

interface PreTournamentPick {
  id: number;
  score: number;
  finalFourPicks: FinalFourPick[];
  finalsPicks: FinalsPick[];
  championPick?: ChampionPick;
  cinderellaPicks: CinderellaPick[];
}

interface ParticipantPicks {
  participant: Participant;
  preTournamentPick?: PreTournamentPick;
  gamePicks: GamePick[];
}

interface ParticipantPicksProps {
  tournamentId: number;
  participantId: number | string;
}

// Function to convert numeric round to round string
const getRoundKeyFromNumber = (roundNumber: number): string => {
  switch (roundNumber) {
    case 1: return 'ROUND_64';
    case 2: return 'ROUND_32';
    case 3: return 'SWEET_16';
    case 4: return 'ELITE_8';
    case 5: return 'FINAL_4';
    case 6: return 'CHAMPIONSHIP';
    default: return `ROUND_${roundNumber}`;
  }
};

// Get points for a round
const getPointsForRound = (round: string): number => {
  switch (round) {
    case 'ROUND_64': return 1;
    case 'ROUND_32': return 2;
    case 'SWEET_16': return 4;
    case 'ELITE_8': return 8;
    case 'FINAL_4': return 15;
    case 'CHAMPIONSHIP': return 25;
    default: return 1;
  }
};

const ParticipantPicks: React.FC<ParticipantPicksProps> = ({ tournamentId, participantId }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [matches, setMatches] = useState<Match[]>([]); // New state for matches
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participantPicks, setParticipantPicks] = useState<ParticipantPicks | null>(null);
  const [activeTab, setActiveTab] = useState('preTournament');
  const [isSaving, setIsSaving] = useState(false);

  // Derived state for filtering options
  const cinderellaEligibleTeams = teams.filter(team => team.seed >= 11 && team.seed <= 16);
  
  // Group games by round
  const gamesByRound = games.reduce((acc, game) => {
    if (!acc[game.round]) {
      acc[game.round] = [];
    }
    acc[game.round].push(game);
    return acc;
  }, {} as Record<string, Game[]>);

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    const roundKey = getRoundKeyFromNumber(match.round);
    if (!acc[roundKey]) {
      acc[roundKey] = [];
    }
    acc[roundKey].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Function to convert round string to display name
  const getRoundDisplayName = (round: string) => {
    switch (round) {
      case 'ROUND_64': return 'Round of 64';
      case 'ROUND_32': return 'Round of 32';
      case 'SWEET_16': return 'Sweet 16';
      case 'ELITE_8': return 'Elite 8';
      case 'FINAL_4': return 'Final Four';
      case 'CHAMPIONSHIP': return 'Championship';
      default: return round;
    }
  };

  // Round order for sorting
  const roundOrder = ['ROUND_64', 'ROUND_32', 'SWEET_16', 'ELITE_8', 'FINAL_4', 'CHAMPIONSHIP'];

  // Load teams, games, matches, and tournament data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch teams
        const teamsResponse = await fetch(`/api/tournaments/${tournamentId}/teams`);
        if (!teamsResponse.ok) throw new Error('Failed to load teams');
        const teamsData = await teamsResponse.json();
        
        // Fetch games
        const gamesResponse = await fetch(`/api/tournaments/${tournamentId}/games`);
        if (!gamesResponse.ok) throw new Error('Failed to load games');
        const gamesData = await gamesResponse.json();
        
        // Fetch matches
        const matchesResponse = await fetch(`/api/tournaments/${tournamentId}/matches`);
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json();
          setMatches(matchesData);
        }
        
        // Fetch tournament
        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
        if (!tournamentResponse.ok) throw new Error('Failed to load tournament');
        const tournamentData = await tournamentResponse.json();
        
        setTeams(teamsData);
        setGames(gamesData);
        setTournament(tournamentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [tournamentId]);

  // Load participant picks when participantId changes
  useEffect(() => {
    const fetchParticipantPicks = async () => {
      if (!participantId) return;
      
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/participants/${participantId}/picks`);
        if (!response.ok) throw new Error('Failed to load picks');
        const picksData = await response.json();
        setParticipantPicks(picksData);
        // Reset to pre-tournament tab when loading a new participant
        setActiveTab('preTournament');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchParticipantPicks();
  }, [participantId]);

  // Handle pre-tournament picks changes
  const handlePreTournamentPickChange = (pickType: string, teamId: number, index?: number) => {
    if (!participantPicks) return;
    
    const updatedPicks = { ...participantPicks };
    
    // Initialize preTournamentPick if it doesn't exist
    if (!updatedPicks.preTournamentPick) {
      updatedPicks.preTournamentPick = {
        id: 0, // Will be assigned by API
        score: 0,
        finalFourPicks: [],
        finalsPicks: [],
        cinderellaPicks: []
      };
    }
    
    switch (pickType) {
      case 'finalFour':
        if (index !== undefined) {
          // Update existing pick if it exists
          if (index < updatedPicks.preTournamentPick.finalFourPicks.length) {
            updatedPicks.preTournamentPick.finalFourPicks[index] = {
              ...updatedPicks.preTournamentPick.finalFourPicks[index],
              teamId
            };
          } else {
            // Add new pick
            updatedPicks.preTournamentPick.finalFourPicks.push({ id: 0, teamId });
          }
        }
        break;
      
      case 'finals':
        if (index !== undefined) {
          // Update existing pick if it exists
          if (index < updatedPicks.preTournamentPick.finalsPicks.length) {
            updatedPicks.preTournamentPick.finalsPicks[index] = {
              ...updatedPicks.preTournamentPick.finalsPicks[index],
              teamId
            };
          } else {
            // Add new pick
            updatedPicks.preTournamentPick.finalsPicks.push({ id: 0, teamId });
          }
        }
        break;
      
      case 'champion':
        updatedPicks.preTournamentPick.championPick = { 
          id: updatedPicks.preTournamentPick.championPick?.id || 0, 
          teamId 
        };
        break;
      
      case 'cinderella':
        if (index !== undefined) {
          // Update existing pick if it exists
          if (index < updatedPicks.preTournamentPick.cinderellaPicks.length) {
            updatedPicks.preTournamentPick.cinderellaPicks[index] = {
              ...updatedPicks.preTournamentPick.cinderellaPicks[index],
              teamId
            };
          } else {
            // Add new pick
            updatedPicks.preTournamentPick.cinderellaPicks.push({ id: 0, teamId });
          }
        }
        break;
    }
    
    setParticipantPicks(updatedPicks);
  };

  // Handle game pick changes
  const handleGamePickChange = (gameId: number, teamId: number) => {
    if (!participantPicks) return;
    
    const updatedPicks = { ...participantPicks };
    const existingPickIndex = updatedPicks.gamePicks.findIndex(pick => pick.gameId === gameId);
    
    if (existingPickIndex >= 0) {
      // Update existing pick
      updatedPicks.gamePicks[existingPickIndex] = {
        ...updatedPicks.gamePicks[existingPickIndex],
        teamId
      };
    } else {
      // Add new pick
      updatedPicks.gamePicks.push({
        id: 0, // Will be assigned by API
        gameId,
        teamId,
        roundScore: 0
      });
    }
    
    setParticipantPicks(updatedPicks);
  };

  // Handle match pick changes
  const handleMatchPickChange = (matchId: number, teamId: number) => {
    // For now, just log the selection since we don't have a MatchPick model yet
    console.log(`Selected team ${teamId} for match ${matchId}`);
    
    // TODO: Implement saving match picks once we have a model for it
  };

  // Save all picks
  const savePicks = async () => {
    if (!participantPicks || !participantId) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/participants/${participantId}/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(participantPicks),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save picks');
      }
      
      setSuccess('Picks saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Get team by ID helper
  const getTeamById = (teamId: number) => {
    return teams.find(team => team.id === teamId);
  };

  // Render team option with seed
  const renderTeamOption = (team: Team) => {
    return `(${team.seed}) ${team.name}`;
  };

  if (loading && !participantPicks) {
    return <div className="picks-loading">Loading tournament data...</div>;
  }

  if (error && !participantPicks) {
    return <div className="picks-error">Error: {error}</div>;
  }

  if (!participantPicks) {
    return <div className="picks-error">No pick data available for this participant</div>;
  }

  return (
    <div className="participant-picks-container">
      <h2 className="picks-title">
        Manage Picks for {participantPicks.participant.name}
      </h2>
      
      {/* Message displays */}
      {error && <div className="picks-error-message">{error}</div>}
      {success && <div className="picks-success-message">{success}</div>}
      
      {/* Tabs for different pick sections */}
      <div className="picks-tabs">
        <button 
          className={`picks-tab ${activeTab === 'preTournament' ? 'picks-tab-active' : ''}`}
          onClick={() => setActiveTab('preTournament')}
        >
          Pre-Tournament Picks
        </button>
        
        {roundOrder.map(round => (
          <button 
            key={round}
            className={`picks-tab ${activeTab === round ? 'picks-tab-active' : ''}`}
            onClick={() => setActiveTab(round)}
          >
            {getRoundDisplayName(round)}
          </button>
        ))}
      </div>
      
      {/* Pre-tournament picks section */}
      {activeTab === 'preTournament' && (
        <div className="picks-section">
          <h3 className="picks-section-title">Pre-Tournament Picks</h3>
          
          {/* Final Four picks */}
          <div className="picks-field-group">
            <h4 className="picks-field-title">Final Four Picks (5 points each)</h4>
            <div className="picks-grid">
              {[0, 1, 2, 3].map(index => (
                <div key={`ff-${index}`} className="picks-field">
                  <label htmlFor={`final-four-${index}`}>Team {index + 1}</label>
                  <select
                    id={`final-four-${index}`}
                    value={participantPicks.preTournamentPick?.finalFourPicks[index]?.teamId || ''}
                    onChange={(e) => handlePreTournamentPickChange('finalFour', parseInt(e.target.value), index)}
                    className="picks-select"
                  >
                    <option value="">-- Select Team --</option>
                    {teams.map(team => (
                      <option key={`ff-${index}-${team.id}`} value={team.id}>
                        {renderTeamOption(team)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          
          {/* Finals picks */}
          <div className="picks-field-group">
            <h4 className="picks-field-title">Finals Picks (10 points each)</h4>
            <div className="picks-grid">
              {[0, 1].map(index => (
                <div key={`finals-${index}`} className="picks-field">
                  <label htmlFor={`finals-${index}`}>Team {index + 1}</label>
                  <select
                    id={`finals-${index}`}
                    value={participantPicks.preTournamentPick?.finalsPicks[index]?.teamId || ''}
                    onChange={(e) => handlePreTournamentPickChange('finals', parseInt(e.target.value), index)}
                    className="picks-select"
                  >
                    <option value="">-- Select Team --</option>
                    {teams.map(team => (
                      <option key={`finals-${index}-${team.id}`} value={team.id}>
                        {renderTeamOption(team)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          
          {/* Champion pick */}
          <div className="picks-field-group">
            <h4 className="picks-field-title">Champion Pick (25 points)</h4>
            <div className="picks-field">
              <label htmlFor="champion-pick">Champion</label>
              <select
                id="champion-pick"
                value={participantPicks.preTournamentPick?.championPick?.teamId || ''}
                onChange={(e) => handlePreTournamentPickChange('champion', parseInt(e.target.value))}
                className="picks-select"
              >
                <option value="">-- Select Team --</option>
                {teams.map(team => (
                  <option key={`champ-${team.id}`} value={team.id}>
                    {renderTeamOption(team)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Cinderella picks */}
          <div className="picks-field-group">
            <h4 className="picks-field-title">Cinderella Picks (Seeds 11-16, double points for each win)</h4>
            <div className="picks-grid">
              {[0, 1].map(index => (
                <div key={`cinderella-${index}`} className="picks-field">
                  <label htmlFor={`cinderella-${index}`}>Cinderella {index + 1}</label>
                  <select
                    id={`cinderella-${index}`}
                    value={participantPicks.preTournamentPick?.cinderellaPicks[index]?.teamId || ''}
                    onChange={(e) => handlePreTournamentPickChange('cinderella', parseInt(e.target.value), index)}
                    className="picks-select"
                  >
                    <option value="">-- Select Team --</option>
                    {cinderellaEligibleTeams.map(team => (
                      <option key={`cinderella-${index}-${team.id}`} value={team.id}>
                        {renderTeamOption(team)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Round-specific game/match picks */}
      {activeTab !== 'preTournament' && (
        <div className="picks-section">
          <h3 className="picks-section-title">{getRoundDisplayName(activeTab)} Picks</h3>
          
          {/* Show games or matches if available for this round */}
          {(gamesByRound[activeTab]?.length > 0 || matchesByRound[activeTab]?.length > 0) ? (
            <div className="picks-games-list">
              {/* Render games for this round if available */}
              {gamesByRound[activeTab]?.map(game => {
                const team1 = getTeamById(game.team1Id);
                const team2 = getTeamById(game.team2Id);
                const currentPick = participantPicks.gamePicks.find(pick => pick.gameId === game.id);
                
                // Get points for this round
                let pointValue = getPointsForRound(game.round);
                
                return (
                  <div key={`game-${game.id}`} className="picks-game-card">
                    <div className="picks-game-header">
                      <span className="picks-game-region">{game.region}</span>
                      <span className="picks-game-points">{pointValue} pts</span>
                    </div>
                    
                    <div className="picks-game-matchup">
                      <div className={`picks-team-row ${currentPick?.teamId === team1?.id ? 'picks-selected-team' : ''}`}>
                        <span className="picks-team-seed">{team1?.seed}</span>
                        <span className="picks-team-name">{team1?.name}</span>
                        {game.completed && game.winnerId === team1?.id && <span className="picks-winner-badge">Winner</span>}
                      </div>
                      
                      <div className="picks-vs">vs</div>
                      
                      <div className={`picks-team-row ${currentPick?.teamId === team2?.id ? 'picks-selected-team' : ''}`}>
                        <span className="picks-team-seed">{team2?.seed}</span>
                        <span className="picks-team-name">{team2?.name}</span>
                        {game.completed && game.winnerId === team2?.id && <span className="picks-winner-badge">Winner</span>}
                      </div>
                    </div>
                    
                    {game.completed ? (
                      <div className="picks-game-result">
                        {game.team1Score !== null && game.team2Score !== null ? (
                          <span>Final: {team1?.name} {game.team1Score} - {game.team2Score} {team2?.name}</span>
                        ) : (
                          <span>Game completed</span>
                        )}
                        {currentPick && (
                          <span className={`picks-result-badge ${currentPick.correct ? 'picks-correct' : 'picks-incorrect'}`}>
                            {currentPick.correct ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="picks-game-selection">
                        <label htmlFor={`game-${game.id}-pick`}>Your Pick:</label>
                        <select
                          id={`game-${game.id}-pick`}
                          value={currentPick?.teamId || ''}
                          onChange={(e) => handleGamePickChange(game.id, parseInt(e.target.value))}
                          className="picks-select"
                          disabled={game.completed}
                        >
                          <option value="">-- Select Winner --</option>
                          <option value={team1?.id}>{team1?.seed} {team1?.name}</option>
                          <option value={team2?.id}>{team2?.seed} {team2?.name}</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Render matches for this round if available */}
              {matchesByRound[activeTab]?.map(match => {
                const team1 = getTeamById(match.team1Id);
                const team2 = getTeamById(match.team2Id);
                
                // Get points for this round
                let pointValue = getPointsForRound(activeTab);
                
                return (
                  <div key={`match-${match.id}`} className="picks-game-card">
                    <div className="picks-game-header">
                      <span className="picks-game-region">{match.region}</span>
                      <span className="picks-game-points">{pointValue} pts</span>
                    </div>
                    
                    <div className="picks-game-matchup">
                      <div className={`picks-team-row`}>
                        <span className="picks-team-seed">{team1?.seed}</span>
                        <span className="picks-team-name">{team1?.name}</span>
                        {match.winnerId === team1?.id && <span className="picks-winner-badge">Winner</span>}
                      </div>
                      
                      <div className="picks-vs">vs</div>
                      
                      <div className={`picks-team-row`}>
                        <span className="picks-team-seed">{team2?.seed}</span>
                        <span className="picks-team-name">{team2?.name}</span>
                        {match.winnerId === team2?.id && <span className="picks-winner-badge">Winner</span>}
                      </div>
                    </div>
                    
                    {match.winnerId ? (
                      <div className="picks-game-result">
                        <span>Match completed</span>
                      </div>
                    ) : (
                      <div className="picks-game-selection">
                        <label htmlFor={`match-${match.id}-pick`}>Your Pick:</label>
                        <select
                          id={`match-${match.id}-pick`}
                          onChange={(e) => handleMatchPickChange(match.id, parseInt(e.target.value))}
                          className="picks-select"
                        >
                          <option value="">-- Select Winner --</option>
                          <option value={match.team1Id}>
                            {team1?.seed} {team1?.name}
                          </option>
                          <option value={match.team2Id}>
                            {team2?.seed} {team2?.name}
                          </option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="picks-empty-state">
              <p className="participant-empty-text">
                No games available for {getRoundDisplayName(activeTab)} yet.
              </p>
              <p className="participant-empty-text-small">
                Games will appear here once they are scheduled by the tournament administrator.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Save button */}
      <div className="picks-actions">
        <button 
          className="picks-save-button"
          onClick={savePicks}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save All Picks'}
        </button>
      </div>
    </div>
  );
};

export default ParticipantPicks;